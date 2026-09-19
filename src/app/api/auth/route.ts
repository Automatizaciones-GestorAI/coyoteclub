import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSession, createAdminSession, safeEqual } from '@/lib/auth';
import { dummyVerify, hashPassword, verifyPassword } from '@/lib/password';
import { supabaseAdmin } from '@/lib/supabase';
import { addHit, clearHits, clientIp, retryAfter } from '@/lib/ratelimit';

const WINDOW = 15 * 60_000; // 15 minutos
const PER_IP = 5; // fallos por IP dentro de la ventana
const PER_USER = 10; // fallos por usuario (frena ataques repartidos entre muchas IPs a una misma cuenta)
const GLOBAL = 40; // fallos totales

const GENERIC = 'Usuario o contraseña incorrectos';

export async function POST(req: NextRequest) {
  const ipKey = `login:${clientIp(req)}`;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }
  // Si no llega usuario (formulario antiguo) se entiende "admin", el usuario inicial
  const username = String(body?.username ?? '').trim().toLowerCase() || 'admin';
  const password = body?.password;
  if (typeof password !== 'string' || password.length === 0 || password.length > 200 || username.length > 60) {
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  const userKey = `login-user:${username}`;
  const wait = Math.max(retryAfter(ipKey, PER_IP), retryAfter('login:global', GLOBAL), retryAfter(userKey, PER_USER));
  if (wait) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  const { data: existing, error } = await supabaseAdmin.from('admin_users').select('*').eq('username', username).maybeSingle();
  if (error) {
    console.error('[login] no se pudo consultar admin_users:', error.message);
    return NextResponse.json({ error: 'El panel no está disponible ahora mismo' }, { status: 503 });
  }

  let user = existing;
  let ok = false;
  if (user) {
    ok = await verifyPassword(password, user.password_hash);
  } else {
    // Primer arranque: con la tabla vacía, "admin" + la ADMIN_PASSWORD del servidor crea el usuario inicial (gestor).
    const { count } = await supabaseAdmin.from('admin_users').select('id', { count: 'exact', head: true });
    const bootstrap = process.env.ADMIN_PASSWORD || '';
    if ((count ?? 0) === 0 && username === 'admin' && bootstrap && safeEqual(password, bootstrap)) {
      const { data: created, error: insError } = await supabaseAdmin
        .from('admin_users')
        .insert({ username: 'admin', display_name: 'Administrador', password_hash: await hashPassword(password), role: 'admin', can_manage_users: true })
        .select('*')
        .single();
      if (insError) {
        // Otro inicio de sesión lo creó a la vez: se vuelve a leer
        const again = await supabaseAdmin.from('admin_users').select('*').eq('username', 'admin').maybeSingle();
        user = again.data;
        ok = !!user && (await verifyPassword(password, user.password_hash));
      } else {
        user = created;
        ok = true;
        console.log('[seguridad] creado el usuario inicial "admin" a partir de ADMIN_PASSWORD');
      }
    } else {
      await dummyVerify(password);
    }
  }

  if (!ok || !user) {
    addHit(ipKey, WINDOW);
    addHit('login:global', WINDOW);
    addHit(userKey, WINDOW);
    await new Promise((r) => setTimeout(r, 400)); // frena el ritmo de los intentos
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }
  if (!user.is_active) {
    return NextResponse.json({ error: 'Este usuario está desactivado. Habla con quien administra el panel.' }, { status: 403 });
  }

  clearHits(ipKey);
  clearHits(userKey);
  await supabaseAdmin.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
  await createAdminSession(user.id, user.username);
  return NextResponse.json({ ok: true, role: user.role, next: user.role === 'door' ? '/scan' : '/admin/ventas' });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}

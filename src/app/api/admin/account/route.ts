import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, staffGuard } from '@/lib/auth';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/password';
import { supabaseAdmin } from '@/lib/supabase';
import { addHit, clearHits, retryAfter } from '@/lib/ratelimit';

// Cambiar la propia contraseña (cualquier perfil). Exige la actual; las demás sesiones abiertas de esta persona se cierran.
export async function POST(req: NextRequest) {
  const { session, denied } = await staffGuard();
  if (denied) return denied;
  const key = `account:${session.id}`;
  const wait = retryAfter(key, 5);
  if (wait) return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429, headers: { 'Retry-After': String(wait) } });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }
  const { current, next } = body ?? {};
  const { data: user } = await supabaseAdmin.from('admin_users').select('password_hash').eq('id', session.id).maybeSingle();
  if (!user || typeof current !== 'string' || !(await verifyPassword(current, user.password_hash))) {
    addHit(key, 15 * 60_000);
    return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 400 });
  }
  const problem = passwordProblem(next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (next === current) return NextResponse.json({ error: 'La contraseña nueva debe ser distinta de la actual.' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('admin_users')
    .update({ password_hash: await hashPassword(next), password_changed_at: new Date().toISOString() })
    .eq('id', session.id);
  if (error) {
    console.error('[account] no se pudo cambiar la contraseña', error.message);
    return NextResponse.json({ error: 'No se pudo cambiar la contraseña.' }, { status: 500 });
  }
  clearHits(key);
  await createAdminSession(session.id, session.username); // esta sesión sigue abierta; las demás dejan de valer
  return NextResponse.json({ ok: true });
}

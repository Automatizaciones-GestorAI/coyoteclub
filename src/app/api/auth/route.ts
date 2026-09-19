import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, clearAdminSession, safeEqual } from '@/lib/auth';
import { addHit, clearHits, clientIp, retryAfter } from '@/lib/ratelimit';

const WINDOW = 15 * 60_000; // 15 minutos
const PER_IP = 5; // fallos por IP dentro de la ventana
const GLOBAL = 40; // fallos totales (frena ataques repartidos entre muchas IPs)

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) {
    console.error('[seguridad] ADMIN_PASSWORD no está definida: el panel no puede iniciar sesión');
    return NextResponse.json({ error: 'Panel no configurado' }, { status: 503 });
  }

  const ipKey = `login:${clientIp(req)}`;
  const wait = Math.max(retryAfter(ipKey, PER_IP), retryAfter('login:global', GLOBAL));
  if (wait) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }

  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    addHit(ipKey, WINDOW);
    addHit('login:global', WINDOW);
    await new Promise((r) => setTimeout(r, 400)); // frena el ritmo de los intentos
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  clearHits(ipKey);
  await createAdminSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}

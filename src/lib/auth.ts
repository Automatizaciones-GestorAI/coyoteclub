import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'coyote_admin_session';

let warnedWeakSecret = false;
function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (secret.length < 32 && !warnedWeakSecret) {
    warnedWeakSecret = true;
    console.warn('[seguridad] ADMIN_SESSION_SECRET tiene menos de 32 caracteres: usa una cadena aleatoria larga (48+).');
  }
  return new TextEncoder().encode(secret);
}

// Comparación en tiempo constante (evita deducir la contraseña midiendo tiempos de respuesta).
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function createAdminSession() {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearAdminSession() {
  cookies().delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

// Para las rutas /api/admin/*: devuelve una respuesta 401 si no hay sesión de admin, o null si la hay.
export async function adminGuard(): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

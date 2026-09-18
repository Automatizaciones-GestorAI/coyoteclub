import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'coyote_admin_session';

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET!);
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

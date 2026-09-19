import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase';

const COOKIE_NAME = 'coyote_admin_session';

export type Role = 'admin' | 'door';
export type Session = { id: string; username: string; displayName: string | null; role: Role; canManageUsers: boolean };

let warnedWeakSecret = false;
function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (secret.length < 32 && !warnedWeakSecret) {
    warnedWeakSecret = true;
    console.warn('[seguridad] ADMIN_SESSION_SECRET tiene menos de 32 caracteres: usa una cadena aleatoria larga (48+).');
  }
  return new TextEncoder().encode(secret);
}

// Comparación en tiempo constante (evita deducir un secreto midiendo tiempos de respuesta).
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

// La cookie solo identifica al usuario; su perfil y si sigue activo se comprueban en la base de datos
// en cada petición, así que desactivar a alguien o cambiar su contraseña cierra su sesión al instante.
export async function createAdminSession(userId: string, username: string) {
  const token = await new SignJWT({ u: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  let payload;
  try {
    ({ payload } = await jwtVerify(token, getSecret()));
  } catch {
    return null;
  }
  if (typeof payload.sub !== 'string') return null; // sesiones del formato antiguo (sin usuario): hay que volver a entrar

  const { data: u, error } = await supabaseAdmin
    .from('admin_users')
    .select('id, username, display_name, role, can_manage_users, is_active, password_changed_at')
    .eq('id', payload.sub)
    .maybeSingle();
  if (error || !u || !u.is_active) return null;
  // Si la contraseña se cambió después de iniciar esta sesión, la sesión ya no vale
  if (payload.iat && (payload.iat + 1) * 1000 < new Date(u.password_changed_at).getTime()) return null;
  return { id: u.id, username: u.username, displayName: u.display_name, role: u.role as Role, canManageUsers: !!u.can_manage_users };
});

// Página de inicio de cada perfil
export const homeFor = (s: Session) => (s.role === 'door' ? '/scan' : '/admin/ventas');

// Rutas /api/admin/* de administración (eventos, precios, galería, subidas): solo el perfil admin.
export async function adminGuard(): Promise<NextResponse | null> {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (s.role !== 'admin') return NextResponse.json({ error: 'No tienes permiso para esto' }, { status: 403 });
  return null;
}

// Rutas que también usa la puerta (escáner, entradas): admin o puerta. Devuelve la sesión para anotar quién actúa.
export async function staffGuard(): Promise<{ session: Session; denied?: undefined } | { session?: undefined; denied: NextResponse }> {
  const s = await getSession();
  if (!s) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  return { session: s };
}

// Rutas de gestión de usuarios: solo quien tiene el permiso.
export async function managerGuard(): Promise<{ session: Session; denied?: undefined } | { session?: undefined; denied: NextResponse }> {
  const s = await getSession();
  if (!s) return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  if (s.role !== 'admin' || !s.canManageUsers) return { denied: NextResponse.json({ error: 'No tienes permiso para gestionar usuarios' }, { status: 403 }) };
  return { session: s };
}

import { NextRequest, NextResponse } from 'next/server';
import { managerGuard } from '@/lib/auth';
import { hashPassword, passwordProblem } from '@/lib/password';
import { supabaseAdmin } from '@/lib/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME = /^[a-z0-9._-]{3,30}$/;
const ROLES = ['admin', 'door'];
const SAFE = 'id, username, display_name, role, can_manage_users, is_active, last_login_at, created_at';

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Crear un usuario (solo quien puede gestionar usuarios)
export async function POST(req: NextRequest) {
  const { denied } = await managerGuard();
  if (denied) return denied;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('Petición no válida', 400);
  }
  const username = String(body?.username ?? '').trim().toLowerCase();
  const displayName = String(body?.display_name ?? '').trim();
  const role = String(body?.role ?? '');
  const password = body?.password;
  if (!USERNAME.test(username)) return fail('El usuario debe tener de 3 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo.', 400);
  if (displayName.length > 60) return fail('El nombre es demasiado largo (máximo 60).', 400);
  if (!ROLES.includes(role)) return fail('Elige un perfil: Administrador o Puerta.', 400);
  const problem = passwordProblem(password);
  if (problem) return fail(problem, 400);
  const manage = role === 'admin' && body?.can_manage_users === true;

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert({ username, display_name: displayName || null, password_hash: await hashPassword(password), role, can_manage_users: manage })
    .select(SAFE)
    .single();
  if (error) {
    if (error.code === '23505') return fail('Ya existe un usuario con ese nombre.', 409);
    console.error('[users] no se pudo crear', error.message);
    return fail('No se pudo crear el usuario.', 500);
  }
  return NextResponse.json(data);
}

// Cambiar un usuario: activar/desactivar, perfil, permiso de gestión, contraseña o nombre
export async function PATCH(req: NextRequest) {
  const { session, denied } = await managerGuard();
  if (denied) return denied;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('Petición no válida', 400);
  }
  const id = String(body?.id ?? '');
  const action = String(body?.action ?? '');
  const value = body?.value;
  if (!UUID.test(id)) return fail('Petición no válida', 400);
  // Nadie cambia su propio acceso desde aquí (evita quedarse fuera por error); su contraseña la cambia en "Mi cuenta"
  if (id === session.id && action !== 'set_name') return fail('No puedes cambiar tu propio acceso. Pídeselo a otra persona con ese permiso.', 400);

  let patch: Record<string, unknown>;
  if (action === 'set_active' && typeof value === 'boolean') patch = { is_active: value };
  else if (action === 'set_role' && ROLES.includes(value)) patch = value === 'door' ? { role: 'door', can_manage_users: false } : { role: 'admin' };
  else if (action === 'set_manage' && typeof value === 'boolean') patch = { can_manage_users: value };
  else if (action === 'set_name' && typeof value === 'string' && value.trim().length <= 60) patch = { display_name: value.trim() || null };
  else if (action === 'reset_password') {
    const problem = passwordProblem(value);
    if (problem) return fail(problem, 400);
    patch = { password_hash: await hashPassword(value), password_changed_at: new Date().toISOString() };
  } else return fail('Acción no válida', 400);

  const { data, error } = await supabaseAdmin.from('admin_users').update(patch).eq('id', id).select(SAFE).maybeSingle();
  if (error) {
    if (error.code === 'P0001') return fail('Debe quedar al menos un usuario activo que pueda gestionar usuarios.', 409);
    if (error.code === '23514') return fail('Ese cambio no es válido (solo un Administrador puede gestionar usuarios).', 400);
    console.error('[users] no se pudo actualizar', error.message);
    return fail('No se pudo completar el cambio.', 500);
  }
  if (!data) return fail('Usuario no encontrado.', 404);
  return NextResponse.json(data);
}

// Borrar un usuario de verdad (no solo desactivarlo). El nombre queda igualmente en el historial (ticket_audit.actor,
// tickets.used_by son texto, no una referencia): lo que hizo esa persona no desaparece, solo su acceso.
export async function DELETE(req: NextRequest) {
  const { session, denied } = await managerGuard();
  if (denied) return denied;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('Petición no válida', 400);
  }
  const id = String(body?.id ?? '');
  if (!UUID.test(id)) return fail('Petición no válida', 400);
  if (id === session.id) return fail('No puedes borrar tu propio usuario. Pídeselo a otra persona con ese permiso.', 400);

  const { error, count } = await supabaseAdmin.from('admin_users').delete({ count: 'exact' }).eq('id', id);
  if (error) {
    if (error.code === 'P0001') return fail('Debe quedar al menos un usuario activo que pueda gestionar usuarios: desactívalo o dale antes ese permiso a otra persona.', 409);
    console.error('[users] no se pudo borrar', error.message);
    return fail('No se pudo borrar el usuario.', 500);
  }
  if (!count) return fail('Usuario no encontrado.', 404);
  return NextResponse.json({ ok: true });
}

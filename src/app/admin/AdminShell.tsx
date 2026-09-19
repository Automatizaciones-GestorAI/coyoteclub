import { redirect } from 'next/navigation';
import { getSession, homeFor, Session } from '@/lib/auth';
import AdminNav from './AdminNav';
import { getReviewCount } from '@/lib/review';

// /admin/login cuelga de esta misma carpeta, así que el layout no puede exigir sesión
// (redirigiría a /admin/login en bucle). Cada página del panel llama a require...() antes de
// consultar datos y se envuelve en <AdminShell> para pintar el menú.

// Páginas de administración: solo el perfil admin (la puerta vuelve a su pantalla).
export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/admin/login');
  if (s.role !== 'admin') redirect(homeFor(s));
  return s;
}

// Páginas que también usa la puerta (buscar entradas, mi cuenta)
export async function requireStaff(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/admin/login');
  return s;
}

// Gestión de usuarios: solo quien tiene el permiso
export async function requireManager(): Promise<Session> {
  const s = await requireAdmin();
  if (!s.canManageUsers) redirect('/admin/ventas');
  return s;
}

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  const alerts = s?.role === 'admin' ? await getReviewCount() : 0; // cobros por revisar: aviso rojo en el menú
  return (
    <div className="admin-shell">
      <AdminNav alerts={alerts} role={s?.role ?? 'admin'} manager={!!s?.canManageUsers} name={s?.displayName || s?.username || ''} />
      <main className="admin-main">{children}</main>
    </div>
  );
}

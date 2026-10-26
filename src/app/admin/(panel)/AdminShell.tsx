import { redirect } from 'next/navigation';
import { getSession, homeFor, Session } from '@/lib/auth';
import AdminNav from './AdminNav';
import { getReviewCount } from '@/lib/review';

// Cada página del panel llama a require...() antes de consultar datos. El menú y la comprobación de
// sesión del conjunto viven en layout.tsx (que usa <AdminShell>).

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

export default function AdminShell({ session, children }: { session: Session; children: React.ReactNode }) {
  // Cobros por revisar (aviso rojo del menú). No se espera aquí: la consulta arranca ya y el aviso aparece
  // cuando llega, sin retrasar ni la primera pintura ni la página. Se refresca con router.refresh().
  const alerts = session.role === 'admin' ? getReviewCount() : Promise.resolve(0);
  return (
    <div className="admin-shell">
      <AdminNav alerts={alerts} role={session.role} manager={!!session.canManageUsers} name={session.displayName || session.username || ''} />
      <main className="admin-main">{children}</main>
    </div>
  );
}

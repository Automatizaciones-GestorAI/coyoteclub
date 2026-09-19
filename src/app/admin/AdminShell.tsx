import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';
import AdminNav from './AdminNav';
import { getReviewCount } from '@/lib/review';

// /admin/login cuelga de esta misma carpeta, así que el layout no puede exigir sesión
// (redirigiría a /admin/login en bucle). Cada página del panel llama a requireAdmin()
// antes de consultar datos y se envuelve en <AdminShell> para pintar el menú.
export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login');
}

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const alerts = await getReviewCount(); // cobros por revisar: aviso rojo en el menú
  return (
    <div className="admin-shell">
      <AdminNav alerts={alerts} />
      <main className="admin-main">{children}</main>
    </div>
  );
}

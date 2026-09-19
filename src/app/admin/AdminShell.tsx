import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';
import AdminNav from './AdminNav';

// /admin/login cuelga de esta misma carpeta, así que el layout no puede exigir sesión
// (redirigiría a /admin/login en bucle). Cada página del panel llama a requireAdmin()
// antes de consultar datos y se envuelve en <AdminShell> para pintar el menú.
export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login');
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">{children}</main>
    </div>
  );
}

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
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <AdminNav />
      <main style={{ flex: 1, padding: '32px 40px' }}>{children}</main>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';
import AdminNav from './AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdminAuthenticated();
  // La propia página de login vive fuera de esta comprobación (ver src/app/admin/login)
  if (!authed) redirect('/admin/login');

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <AdminNav />
      <main style={{ flex: 1, padding: '32px 40px' }}>{children}</main>
    </div>
  );
}

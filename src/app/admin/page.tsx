import { redirect } from 'next/navigation';
import { requireAdmin } from './AdminShell';

export const dynamic = 'force-dynamic';

// «Resumen» se ha fundido con «Ventas»: el inicio del panel es ahora la pantalla de ventas.
export default async function AdminHome() {
  await requireAdmin();
  redirect('/admin/ventas');
}

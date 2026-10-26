import { redirect } from 'next/navigation';
import { homeFor } from '@/lib/auth';
import { requireStaff } from './AdminShell';

export const dynamic = 'force-dynamic';

// Cada perfil aterriza en lo suyo: la administración en Ventas y la puerta en el escáner.
export default async function AdminHome() {
  const s = await requireStaff();
  redirect(homeFor(s));
}

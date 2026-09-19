import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ScanClient from './ScanClient';

export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const s = await getSession();
  if (!s) redirect('/admin/login');
  return <ScanClient canPanel={s.role === 'admin'} />;
}

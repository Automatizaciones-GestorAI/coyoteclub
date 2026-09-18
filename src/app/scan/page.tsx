import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';
import ScanClient from './ScanClient';

export default async function ScanPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect('/admin/login');
  return <ScanClient />;
}

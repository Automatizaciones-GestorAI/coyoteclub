import { supabaseAdmin } from '@/lib/supabase';
import AdminShell, { requireAdmin } from '../AdminShell';
import EventsClient from './EventsClient';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  await requireAdmin();
  const { data } = await supabaseAdmin.from('events').select('*').order('sort_order');
  return (
    <AdminShell>
      <EventsClient initialEvents={data || []} />
    </AdminShell>
  );
}

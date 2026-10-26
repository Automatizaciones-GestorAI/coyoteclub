import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '../AdminShell';
import EventsClient from './EventsClient';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  await requireAdmin();
  const { data } = await supabaseAdmin.from('events').select('*').order('event_date');
  return <EventsClient initialEvents={data || []} />;
}

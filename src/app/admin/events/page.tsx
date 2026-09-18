import { supabaseAdmin } from '@/lib/supabase';
import EventsClient from './EventsClient';

export default async function EventsPage() {
  const { data } = await supabaseAdmin.from('events').select('*').order('sort_order');
  return <EventsClient initialEvents={data || []} />;
}

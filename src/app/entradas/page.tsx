import { supabaseAdmin } from '@/lib/supabase';
import EntradasClient from './EntradasClient';

export default async function EntradasPage() {
  const { data: tiers } = await supabaseAdmin
    .from('price_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title, event_date, event_time')
    .eq('is_published', true)
    .order('sort_order');

  return <EntradasClient tiers={tiers || []} events={events || []} />;
}

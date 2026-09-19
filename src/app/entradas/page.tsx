import { supabaseAdmin } from '@/lib/supabase';
import EntradasClient from './EntradasClient';
import { availability } from '@/lib/stock';

export const dynamic = 'force-dynamic';

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

  // El número de entradas que quedan no sale del servidor: solo el estado (ok / low / soldout).
  const publicTiers = (tiers || []).map(({ stock, ...tier }) => ({
    ...tier,
    availability: availability({ kind: tier.kind, stock })
  }));

  return <EntradasClient tiers={publicTiers} events={events || []} />;
}

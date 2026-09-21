import { supabaseAdmin } from '@/lib/supabase';
import EntradasClient from './EntradasClient';
import { bestAvailability, isUpcoming, nightsFor, tierAvailability, type Availability, type NightInfo } from '@/lib/stock';
import { expirePending, getUsage } from '@/lib/stock-db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Entradas · Coyote Club',
  description: 'Compra online tu entrada para las noches de Coyote Club en Seseña (Toledo). Pago seguro con tarjeta.'
};

export default async function EntradasPage({ searchParams }: { searchParams: Promise<{ pago?: string }> }) {
  const { pago } = await searchParams;
  await expirePending(); // libera plazas de compras abandonadas
  const { data: tiers } = await supabaseAdmin
    .from('price_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title, event_date, event_time, capacity')
    .eq('is_published', true)
    .order('sort_order');

  // Aforo por noche: solo se ofrecen las noches que aún se pueden comprar. El número de entradas que
  // quedan no sale del servidor: solo el estado de cada tramo en cada noche (ok / low / soldout).
  const usage = await getUsage();
  const published = events || [];
  const upcoming = published.filter((e) => isUpcoming(e.event_date));
  const nightInfos: NightInfo[] = upcoming.map((e) => ({ id: e.id, capacity: e.capacity ?? null }));
  const publicTiers = (tiers || []).map(({ stock, night_limit, ...tier }) => {
    const nights = nightsFor(tier, nightInfos, published.length > 0);
    const perNight: Record<string, Availability> = {};
    for (const n of nights) if (n.id) perNight[n.id] = tierAvailability({ ...tier, night_limit }, n, usage);
    const availability: Availability =
      tier.kind === 'door' ? 'ok' : bestAvailability(nights.map((n) => tierAvailability({ ...tier, night_limit }, n, usage)));
    return { ...tier, availability, nights: perNight };
  });
  const publicEvents = upcoming.map(({ id, title, event_date, event_time }) => ({ id, title, event_date, event_time }));

  return (
    <EntradasClient
      tiers={publicTiers}
      events={publicEvents}
      noUpcoming={published.length > 0 && upcoming.length === 0}
      paymentFailed={pago === 'ko'}
      paymentUnknown={pago === 'err'}
    />
  );
}

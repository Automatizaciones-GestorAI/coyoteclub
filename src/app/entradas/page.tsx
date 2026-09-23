import { supabaseAdmin } from '@/lib/supabase';
import EntradasClient from './EntradasClient';
import { bestAvailability, isUpcoming, nightsFor, tierAvailability, type Availability, type NightInfo } from '@/lib/stock';
import { expirePending, getUsage } from '@/lib/stock-db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Entradas · Coyote Club',
  description: 'Compra online tu entrada para las noches de Coyote Club, discoteca en Seseña (Toledo). Pago seguro con tarjeta, Apple Pay y Google Pay.',
  alternates: { canonical: '/entradas' }
};

export default async function EntradasPage({ searchParams }: { searchParams: Promise<{ pago?: string; evento?: string }> }) {
  const { pago, evento } = await searchParams;
  await expirePending(); // libera plazas de compras abandonadas
  const { data: tiers } = await supabaseAdmin
    .from('price_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title, event_date, event_time, capacity, free_entry')
    .eq('is_published', true)
    .order('event_date');

  // Aforo por noche: solo se ofrecen las noches que aún se pueden comprar. El número de entradas que
  // quedan no sale del servidor: solo el estado de cada tramo en cada noche (ok / low / soldout).
  // Las noches de entrada gratuita solo entran en el cálculo de los tramos de tipo "consumición" (bonos de
  // copas, ofertas...): los de tipo "entrada" no tienen nada que vender ahí, la entrada ya es gratis.
  const usage = await getUsage();
  const published = events || [];
  const allUpcoming = published.filter((e) => isUpcoming(e.event_date));
  const paidNights: NightInfo[] = allUpcoming.filter((e) => !e.free_entry).map((e) => ({ id: e.id, capacity: e.capacity ?? null }));
  const allNights: NightInfo[] = allUpcoming.map((e) => ({ id: e.id, capacity: e.capacity ?? null }));
  const publicTiers = (tiers || []).map(({ stock, night_limit, ...tier }) => {
    const offered = tier.category === 'consumicion' ? allNights : paidNights;
    const nights = nightsFor(tier, offered, published.length > 0);
    const perNight: Record<string, Availability> = {};
    for (const n of nights) if (n.id) perNight[n.id] = tierAvailability({ ...tier, night_limit }, n, usage);
    const availability: Availability =
      tier.kind === 'door' ? 'ok' : bestAvailability(nights.map((n) => tierAvailability({ ...tier, night_limit }, n, usage)));
    return { ...tier, availability, nights: perNight };
  });
  const publicEvents = allUpcoming.map(({ id, title, event_date, event_time, free_entry }) => ({ id, title, event_date, event_time, free_entry }));
  // El enlace de cada noche en la portada trae ?evento=<id>: si es una noche real y sigue en venta, se elige sola.
  const initialEventId = evento && publicEvents.some((e) => e.id === evento) ? evento : undefined;

  return (
    <EntradasClient
      tiers={publicTiers}
      events={publicEvents}
      initialEventId={initialEventId}
      noUpcoming={published.length > 0 && allUpcoming.length === 0}
      paymentFailed={pago === 'ko'}
      paymentUnknown={pago === 'err'}
    />
  );
}

import { supabaseAdmin } from '@/lib/supabase';
import { getUsage } from '@/lib/stock-db';
import { isUpcoming } from '@/lib/stock';
import AdminShell, { requireAdmin } from '../AdminShell';
import PricingClient from './PricingClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  await requireAdmin();
  const [{ data }, { data: events }, usage] = await Promise.all([
    supabaseAdmin.from('price_tiers').select('*').order('sort_order'),
    supabaseAdmin.from('events').select('id,title,event_date').order('event_date'),
    getUsage()
  ]);

  // Cuántas entradas lleva cada tramo en cada noche próxima (pendientes de pago + pagadas + usadas).
  const nights = (events || []).filter((e) => isUpcoming(e.event_date));
  const label = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const stats: Record<string, { label: string; n: number }[]> = {};
  for (const t of data || []) stats[t.id] = nights.map((e) => ({ label: `${e.title} · ${label(e.event_date)}`, n: usage.tier[`${e.id}|${t.id}`] ?? 0 }));

  return (
    <AdminShell>
      <PricingClient initialTiers={data || []} stats={stats} />
    </AdminShell>
  );
}

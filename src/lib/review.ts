import { supabaseAdmin } from '@/lib/supabase';

const DAY = 86_400_000;
// Resultados de un aviso del banco que necesitan que una persona los mire
export const ANOMALIES = ['amount_mismatch', 'not_found', 'reactivated_oversold', 'error', 'bad_currency'];

export const ANOMALY_TEXT: Record<string, string> = {
  amount_mismatch: 'El banco cobró un importe distinto del esperado. La entrada NO se ha activado.',
  not_found: 'El banco avisó de un pago de un pedido que no existe en la web.',
  reactivated_oversold: 'Pago tardío entregado, pero ya no quedaban plazas: se ha vendido de más.',
  error: 'Falló el procesado de un aviso del banco (la web tuvo un error). Comprueba que la entrada existe.',
  bad_currency: 'El banco avisó de un cobro en una moneda distinta del euro.'
};

const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();

// Cuántas cosas hay pendientes de revisar (para el aviso rojo del menú). Si algo falla, 0.
export async function getReviewCount(): Promise<number> {
  try {
    const [a, b, c] = await Promise.all([
      supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'cancelled').eq('cancel_reason', 'expired').is('reviewed_at', null).gte('created_at', since(14)),
      supabaseAdmin.from('payment_events').select('id', { count: 'exact', head: true }).in('outcome', ANOMALIES).is('reviewed_at', null).gte('created_at', since(30)),
      supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true }).eq('manual_override', true).is('reviewed_at', null).gte('created_at', since(30))
    ]);
    if (a.error || b.error || c.error) return 0;
    return (a.count ?? 0) + (b.count ?? 0) + (c.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getReviewItems() {
  const [expired, events, manual] = await Promise.all([
    supabaseAdmin.from('tickets').select('*, events(title), price_tiers(label)').eq('status', 'cancelled').eq('cancel_reason', 'expired').is('reviewed_at', null).gte('created_at', since(14)).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('payment_events').select('*').in('outcome', ANOMALIES).is('reviewed_at', null).gte('created_at', since(30)).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('tickets').select('*, events(title), price_tiers(label)').eq('manual_override', true).is('reviewed_at', null).gte('created_at', since(30)).order('used_at', { ascending: false }).limit(50)
  ]);
  return { expired: expired.data ?? [], events: events.data ?? [], manual: manual.data ?? [] };
}

// Cuándo llegó el último aviso del banco (sirve para detectar a tiempo una notificación mal configurada)
export async function getLastBankNotice(): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.from('payment_events').select('created_at').order('created_at', { ascending: false }).limit(1);
    return data?.[0]?.created_at ?? null;
  } catch {
    return null;
  }
}

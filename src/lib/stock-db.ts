import { supabaseAdmin } from '@/lib/supabase';
import { NO_NIGHT, Usage, emptyUsage } from '@/lib/stock';

// PostgREST devuelve PGRST202 si la función no existe: la migración aún no está aplicada.
const FUNCTION_MISSING = 'PGRST202';

/**
 * Entradas que ocupan plaza, por noche y por tramo. La cuenta la hace la base de datos (night_usage).
 * Si falla, la web sigue funcionando (sin avisos de "pocas/agotado"); la venta SIEMPRE la controla create_pending_ticket.
 */
export async function getUsage(): Promise<Usage> {
  const usage = emptyUsage();
  const { data, error } = await supabaseAdmin.rpc('night_usage');
  if (error) {
    if (error.code !== FUNCTION_MISSING) console.error('No se pudo leer la ocupación de las noches', error.message);
    return usage;
  }
  for (const r of (data ?? []) as { event_id: string | null; tier_id: string | null; n: number }[]) {
    const night = r.event_id ?? NO_NIGHT;
    usage.night[night] = (usage.night[night] ?? 0) + r.n;
    if (r.tier_id) usage.tier[`${night}|${r.tier_id}`] = (usage.tier[`${night}|${r.tier_id}`] ?? 0) + r.n;
  }
  return usage;
}

export type CreateTicketResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'night_full' | 'tier_full' | 'no_tier' | 'no_event' };

/**
 * Crea la entrada "pending" si queda sitio esa noche y en ese tramo. Lo hace la función SQL create_pending_ticket
 * en UNA transacción con la noche bloqueada: aunque lleguen cientos de compras a la vez, nunca se pasa el aforo
 * y nadie se queda fuera habiendo sitio.
 */
export async function createPendingTicket(a: {
  event: string | null; tier: string; qr: string; order: string; name: string; phone: string;
  email: string | null; amount: number; termsVersion: string;
}): Promise<CreateTicketResult> {
  const { data, error } = await supabaseAdmin.rpc('create_pending_ticket', {
    p_event: a.event, p_tier: a.tier, p_qr: a.qr, p_order: a.order, p_name: a.name, p_phone: a.phone,
    p_email: a.email, p_amount: a.amount, p_terms_version: a.termsVersion
  });
  if (error) throw error;
  return data as CreateTicketResult;
}

// Anula las entradas que llevan demasiado rato sin pagarse (dejan de ocupar plaza solas).
// Se llama al mostrar la portada, /entradas y al iniciar una compra; como mucho una vez por minuto.
let lastExpire = 0;
export async function expirePending(force = false, minutes = 20): Promise<void> {
  const now = Date.now();
  if (!force && now - lastExpire < 60_000) return;
  lastExpire = now;
  const { error } = await supabaseAdmin.rpc('expire_pending_tickets', { p_minutes: minutes });
  if (error && error.code !== FUNCTION_MISSING) console.error('No se pudieron caducar las entradas pendientes', error.message);
}

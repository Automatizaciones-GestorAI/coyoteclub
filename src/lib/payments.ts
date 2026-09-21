import type Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

// La sesión de pago de Stripe dura 31 minutos (Stripe exige entre 30 minutos y 24 horas) y avisa cuando caduca.
// Esta reserva de respaldo solo actúa si ese aviso se pierde.
export const SESSION_MINUTES = 31;
export const HOLD_MINUTES = 40;

// Guarda cada aviso (nunca datos de tarjeta: Stripe no los envía). La pantalla «Entradas» los enseña como historial del cobro.
export async function logPaymentEvent(e: { order?: string | null; ticketId?: string | null; status?: string | null; amount?: number | null; outcome: string; raw?: Record<string, unknown> }) {
  try {
    await supabaseAdmin.from('payment_events').insert({
      order_id: e.order ?? null,
      ticket_id: e.ticketId ?? null,
      ds_response: e.status ?? null,
      amount_cents: Number.isInteger(e.amount) ? e.amount : null,
      outcome: e.outcome,
      raw: e.raw ?? {}
    });
  } catch (err) {
    console.error('[pagos] no se pudo guardar el aviso en payment_events', (err as Error).message);
  }
}

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : v?.id ?? null);
const line = (o: Record<string, unknown>) => JSON.stringify({ evt: 'stripe', ...o });
// Estos resultados necesitan que una persona los mire
const NEEDS_REVIEW = ['amount_mismatch', 'reactivated_oversold', 'not_found', 'bad_currency', 'error', 'partial_refund', 'refunded_but_used', 'dispute'];
const report = (o: { outcome: string } & Record<string, unknown>) => (NEEDS_REVIEW.includes(o.outcome) ? console.error(line(o)) : console.log(line(o)));

/**
 * Un cobro consumado (aviso de Stripe, vuelta del cliente o comprobación desde el panel): guarda las referencias y da
 * por buena la entrada. Es idempotente: se puede llamar varias veces con la misma sesión.
 * Devuelve el resultado: confirmed | already | reactivated | reactivated_oversold | amount_mismatch | not_found | bad_currency
 */
export async function settlePaidSession(session: Stripe.Checkout.Session, source: 'webhook' | 'return' | 'admin'): Promise<{ outcome: string; qr: string | null }> {
  const order = session.client_reference_id ?? session.metadata?.order_id ?? null;
  const amount = session.amount_total ?? null;
  const base = { order, amount, status: session.payment_status, raw: { source, session: session.id, payment_intent: idOf(session.payment_intent) } };

  if (!order) {
    await logPaymentEvent({ ...base, outcome: 'not_found' });
    report({ outcome: 'not_found', session: session.id });
    return { outcome: 'not_found', qr: null };
  }
  const { data: ticket } = await supabaseAdmin.from('tickets').select('id, qr_code, buyer_email').eq('order_id', order).maybeSingle();
  if (!ticket) {
    await logPaymentEvent({ ...base, outcome: 'not_found' });
    report({ outcome: 'not_found', order, session: session.id });
    return { outcome: 'not_found', qr: null };
  }
  if (session.currency && session.currency.toLowerCase() !== 'eur') {
    await logPaymentEvent({ ...base, ticketId: ticket.id, outcome: 'bad_currency' });
    report({ outcome: 'bad_currency', order, currency: session.currency });
    return { outcome: 'bad_currency', qr: ticket.qr_code };
  }

  // Referencias del cobro y el email que el cliente escribió en la página de pago de Stripe
  const patch: Record<string, string> = { stripe_session_id: session.id };
  const pi = idOf(session.payment_intent);
  if (pi) patch.payment_intent = pi;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (email && !ticket.buyer_email) patch.buyer_email = email;
  await supabaseAdmin.from('tickets').update(patch).eq('id', ticket.id);

  const { data, error } = await supabaseAdmin.rpc('confirm_ticket_payment', { p_order: order, p_amount: amount ?? -1 });
  if (error) {
    await logPaymentEvent({ ...base, ticketId: ticket.id, outcome: 'error' });
    report({ outcome: 'error', order, message: error.message });
    throw error;
  }
  const outcome = String(data);
  await logPaymentEvent({ ...base, ticketId: ticket.id, outcome });
  report({ outcome, order, source });
  return { outcome, qr: ticket.qr_code };
}

/** La sesión de pago caducó o se rechazó: se anula la entrada pendiente y su plaza queda libre. */
export async function cancelPendingOrder(order: string, reason: 'expired' | 'payment_failed', confirmed: boolean, status: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('cancel_pending_order', { p_order: order, p_reason: reason, p_confirmed: confirmed });
  if (error) {
    await logPaymentEvent({ order, status, outcome: 'error' });
    report({ outcome: 'error', order, message: error.message });
    throw error;
  }
  const outcome = data === 'cancelled' ? reason : String(data);
  await logPaymentEvent({ order, status, outcome, raw: { source: 'webhook' } });
  report({ outcome, order });
  return outcome;
}

async function ticketByPayment(paymentIntent: string | null, order: string | null) {
  if (paymentIntent) {
    const { data } = await supabaseAdmin.from('tickets').select('id, order_id').eq('payment_intent', paymentIntent).maybeSingle();
    if (data) return data;
  }
  if (order) {
    const { data } = await supabaseAdmin.from('tickets').select('id, order_id').eq('order_id', order).maybeSingle();
    if (data) return data;
  }
  return null;
}

/** Devolución hecha en el panel de Stripe: si es total, la entrada se anula sola («devuelta»; ya no vale). */
export async function handleRefund(charge: Stripe.Charge): Promise<string> {
  const pi = idOf(charge.payment_intent);
  const ticket = await ticketByPayment(pi, charge.metadata?.order_id ?? null);
  const amount = charge.amount_refunded ?? null;
  const raw = { source: 'webhook', payment_intent: pi, charge: charge.id, refunded: charge.refunded };
  if (!ticket) {
    await logPaymentEvent({ amount, status: 'refunded', outcome: 'not_found', raw });
    report({ outcome: 'not_found', charge: charge.id });
    return 'not_found';
  }
  if (!charge.refunded) {
    await logPaymentEvent({ order: ticket.order_id, ticketId: ticket.id, amount, status: 'partial_refund', outcome: 'partial_refund', raw });
    report({ outcome: 'partial_refund', order: ticket.order_id });
    return 'partial_refund';
  }
  const { data, error } = await supabaseAdmin.rpc('admin_cancel_ticket', { p_ticket: ticket.id, p_reason: 'refunded', p_actor: 'stripe' });
  if (error) {
    await logPaymentEvent({ order: ticket.order_id, ticketId: ticket.id, amount, status: 'refunded', outcome: 'error', raw });
    throw error;
  }
  const outcome = data === 'used' ? 'refunded_but_used' : 'refunded';
  await logPaymentEvent({ order: ticket.order_id, ticketId: ticket.id, amount, status: 'refunded', outcome, raw });
  report({ outcome, order: ticket.order_id });
  return outcome;
}

/** Un cliente ha reclamado el cargo a su banco: no se toca la entrada, pero queda marcado para que el club lo mire. */
export async function handleDispute(dispute: Stripe.Dispute): Promise<string> {
  const pi = idOf(dispute.payment_intent);
  const ticket = await ticketByPayment(pi, null);
  await logPaymentEvent({ order: ticket?.order_id ?? null, ticketId: ticket?.id ?? null, amount: dispute.amount ?? null, status: dispute.status, outcome: 'dispute', raw: { source: 'webhook', payment_intent: pi, reason: dispute.reason } });
  report({ outcome: 'dispute', order: ticket?.order_id ?? null });
  return 'dispute';
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { settlePaidSession, cancelPendingOrder } from '@/lib/payments';
import { addHit, clientIp, retryAfter } from '@/lib/ratelimit';
import { siteBase } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const ORDER = /^[a-f0-9]{12}$/;

// A esta dirección vuelve el cliente desde la página de pago de Stripe:
//  · ?session_id=cs_...  → pagó (o eso parece): se PREGUNTA a Stripe (no se fía de la dirección), se da por buena la entrada
//    si de verdad está cobrada y se le lleva a ella. Así el QR sale al momento, sin esperar al aviso de Stripe.
//  · ?cancelled=<pedido> → pulsó «volver» sin pagar: se anula su reserva para que la plaza quede libre enseguida.
export async function GET(req: NextRequest) {
  const base = (await siteBase()) || new URL(req.url).origin;
  const go = (path: string) => NextResponse.redirect(new URL(path, base), 303);

  const limitKey = `ret:${clientIp(req)}`;
  if (retryAfter(limitKey, 60)) return go('/entradas');
  addHit(limitKey, 10 * 60_000);

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const cancelled = url.searchParams.get('cancelled');

  if (cancelled) {
    if (!ORDER.test(cancelled)) return go('/entradas');
    try {
      const { data: t } = await supabaseAdmin.from('tickets').select('stripe_session_id').eq('order_id', cancelled).maybeSingle();
      await cancelPendingOrder(cancelled, 'payment_failed', true, 'cancelled_by_customer');
      if (t?.stripe_session_id) await getStripe().checkout.sessions.expire(t.stripe_session_id).catch(() => {}); // para que no se pueda pagar después
    } catch (e) {
      console.error('[return] no se pudo anular la reserva cancelada', (e as Error).message);
    }
    return go('/entradas?pago=ko');
  }

  if (!sessionId || !SESSION.test(sessionId)) return go('/entradas');
  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error('[return] no se pudo consultar la sesión en Stripe', (e as Error).message);
    return go('/entradas?pago=err'); // el cobro pudo hacerse: se le dice que no se preocupe y nos escriba
  }
  const order = session.client_reference_id;
  if (!order) return go('/entradas');

  let qr: string | null = null;
  try {
    if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
      qr = (await settlePaidSession(session, 'return')).qr;
    } else {
      const { data: t } = await supabaseAdmin.from('tickets').select('qr_code').eq('order_id', order).maybeSingle();
      qr = t?.qr_code ?? null; // aún sin cobro confirmado: la página de la entrada espera y se actualiza sola
    }
  } catch (e) {
    console.error('[return] error confirmando el pago', (e as Error).message);
    const { data: t } = await supabaseAdmin.from('tickets').select('qr_code').eq('order_id', order).maybeSingle();
    qr = t?.qr_code ?? null; // el aviso de Stripe (webhook) lo terminará de confirmar
  }
  return go(qr ? `/ticket/${qr}` : '/entradas');
}

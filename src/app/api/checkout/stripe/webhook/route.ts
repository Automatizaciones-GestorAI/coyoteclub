import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, getWebhookSecret, StripeNotConfiguredError } from '@/lib/stripe';
import { cancelPendingOrder, handleDispute, handleRefund, logPaymentEvent, settlePaidSession } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe avisa aquí, de servidor a servidor. Solo se hace caso a avisos con firma válida. Si todo va bien se responde 200
// (Stripe reintenta si no); si falla la base de datos se responde 500 para que Stripe vuelva a intentarlo.
export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  try {
    const raw = await req.text(); // el cuerpo EXACTO: la firma se calcula sobre él
    const signature = req.headers.get('stripe-signature') ?? '';
    if (!signature) return NextResponse.json({ error: 'Falta la firma' }, { status: 400 });
    event = getStripe().webhooks.constructEvent(raw, signature, getWebhookSecret());
  } catch (e) {
    if (e instanceof StripeNotConfiguredError) {
      console.error('[stripe] aviso recibido pero Stripe no está configurado:', e.problems.join('; '));
      return NextResponse.json({ error: 'No disponible' }, { status: 503 });
    }
    console.warn('[stripe] aviso con firma inválida descartado');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
          await settlePaidSession(session, 'webhook');
        } else {
          // Método de pago diferido: aún no hay cobro. Llegará checkout.session.async_payment_succeeded (o _failed).
          await logPaymentEvent({ order: session.client_reference_id, status: session.payment_status, amount: session.amount_total, outcome: 'pending_async', raw: { source: 'webhook', session: session.id } });
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.client_reference_id) await cancelPendingOrder(session.client_reference_id, 'expired', true, 'expired');
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.client_reference_id) await cancelPendingOrder(session.client_reference_id, 'payment_failed', true, 'failed');
        break;
      }
      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      case 'charge.dispute.created':
        await handleDispute(event.data.object as Stripe.Dispute);
        break;
      default:
        break; // otros avisos no nos interesan
    }
  } catch (e) {
    console.error('[stripe] error procesando el aviso', event.type, (e as Error).message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe, StripeNotConfiguredError } from '@/lib/stripe';
import { HOLD_MINUTES, SESSION_MINUTES } from '@/lib/payments';
import { createPendingTicket, expirePending } from '@/lib/stock-db';
import { upcomingCutoff } from '@/lib/stock';
import { addHit, clientIp, retryAfter } from '@/lib/ratelimit';
import { siteBase } from '@/lib/site';
import { LEGAL } from '@/lib/legal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE = /^\+?[\d\s().-]{6,20}$/;
const BUY_LIMIT = 8; // compras iniciadas por IP...
const BUY_WINDOW = 10 * 60_000; // ...cada 10 minutos (evita que alguien bloquee las entradas reservándolas en bucle)

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const dmy = (iso: string) => iso.split('-').reverse().join('/');

// El comprador elige tramo + noche y pone nombre y teléfono. Se reserva la entrada como "pending" (sin valor hasta que
// Stripe confirme el cobro) y se le lleva a la página de pago de Stripe. Cuando Stripe avisa (webhook) o el cliente vuelve,
// la entrada pasa a "valid"; si la sesión caduca, se cancela o el pago falla, se anula y la plaza queda libre.
export async function POST(req: NextRequest) {
  const limitKey = `buy:${clientIp(req)}`;
  const wait = retryAfter(limitKey, BUY_LIMIT);
  if (wait) {
    return NextResponse.json(
      { error: 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.' },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }
  addHit(limitKey, BUY_WINDOW);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('Petición no válida', 400);
  }
  const tierId = String(body?.tier_id ?? '');
  const requestedEvent = body?.event_id ? String(body.event_id) : null;
  const name = String(body?.buyer_name ?? '').trim();
  const phone = String(body?.buyer_phone ?? '').trim();
  if (!UUID.test(tierId) || (requestedEvent && !UUID.test(requestedEvent))) return fail('Petición no válida', 400);
  if (name.length < 2 || name.length > 80) return fail('Escribe tu nombre', 400);
  if (!PHONE.test(phone)) return fail('Escribe un teléfono válido', 400);
  if (body?.accepted_terms !== true) return fail('Debes aceptar las condiciones de compra y la política de privacidad', 400);

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    if (e instanceof StripeNotConfiguredError) {
      console.error('[checkout] pago online no disponible:', e.problems.join('; '));
      return fail('El pago online todavía no está disponible. Puedes comprar en taquilla o escribirnos por WhatsApp.', 503);
    }
    throw e;
  }
  const base = await siteBase();
  if (!base) return fail('El pago online todavía no está disponible. Puedes comprar en taquilla o escribirnos por WhatsApp.', 503);

  await expirePending(true, HOLD_MINUTES); // libera antes las plazas de compras abandonadas

  const { data: tier } = await supabaseAdmin.from('price_tiers').select('*').eq('id', tierId).single();
  if (!tier || !tier.is_active || tier.kind === 'door' || !(tier.price_cents > 0)) {
    return fail('Tramo de precio no disponible', 404);
  }

  // La noche: debe existir, estar publicada y no haber pasado. Si hay noches publicadas, hay que elegir una.
  const { data: events } = await supabaseAdmin.from('events').select('id,title,event_date,free_entry').eq('is_published', true);
  const eventId = requestedEvent ?? tier.event_id ?? null;
  let night: { title: string; event_date: string; free_entry: boolean } | null = null;
  if (eventId) {
    night = events?.find((e) => e.id === eventId) ?? null;
    if (!night) return fail('Esa noche no está disponible', 400);
    // Doble comprobación por si alguien salta la web: una noche de entrada gratuita nunca se cobra.
    if (night.free_entry) return fail('Esta noche es de entrada gratuita, no hace falta comprar entrada.', 400);
    if (night.event_date < upcomingCutoff()) return fail('Esa noche ya ha pasado', 400);
    if (tier.event_id && tier.event_id !== eventId) return fail('Este tramo no es de esa noche', 400);
  } else if (events && events.length > 0) {
    return fail('Elige la noche', 400);
  }

  const orderId = crypto.randomBytes(6).toString('hex'); // nº de pedido de 12 caracteres
  const ticketToken = crypto.randomBytes(16).toString('hex'); // 128 bits: la URL de la entrada no se puede adivinar

  // Se guarda la entrada solo si queda sitio esa noche y en ese tramo (comprobación y alta en una sola operación atómica).
  let created;
  try {
    created = await createPendingTicket({
      event: eventId, tier: tier.id, qr: ticketToken, order: orderId, name, phone, email: null,
      amount: tier.price_cents, termsVersion: LEGAL.version
    });
  } catch (e: any) {
    console.error('[checkout] no se pudo crear la entrada:', e?.message ?? e);
    return fail('No se pudo iniciar el pago. Inténtalo de nuevo.', 500);
  }
  if (!created.ok) {
    if (created.reason === 'night_full') return fail('Esta noche ya ha completado el aforo online. Prueba con otra noche o escríbenos por WhatsApp.', 409);
    if (created.reason === 'tier_full') return fail('Este tramo está agotado para esa noche', 409);
    return fail('No se pudo iniciar el pago. Inténtalo de nuevo.', 409);
  }

  // Página de pago de Stripe. Si Stripe falla, la entrada recién reservada se borra (nadie la ha visto) y su plaza vuelve.
  const label = night ? `${night.title} · ${dmy(night.event_date)}` : null;
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        // Solo tarjeta (y con ella, Apple Pay y Google Pay: van bajo el mismo tipo "card" en Stripe). Se excluye
        // Link a propósito: pide un código por SMS a un servicio de Stripe ajeno al banco, y ese código puede
        // tardar mucho en llegar o no llegar. Con Apple Pay/Google Pay no hay ese problema (autenticación del propio móvil).
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: tier.price_cents,
              product_data: { name: `Entrada Coyote Club · ${tier.label}`, ...(label ? { description: label } : {}) }
            }
          }
        ],
        client_reference_id: orderId,
        metadata: { order_id: orderId },
        payment_intent_data: { description: `Coyote Club · ${tier.label}${label ? ' · ' + label : ''}`, metadata: { order_id: orderId } },
        success_url: `${base}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/api/checkout/return?cancelled=${orderId}`,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
        locale: 'es',
        submit_type: 'pay',
        custom_text: { submit: { message: 'Al terminar el pago verás tu entrada con el código QR.' } }
      },
      { idempotencyKey: `coyote-${orderId}` }
    );
    if (!session.url) throw new Error('Stripe no devolvió la dirección de pago');
    await supabaseAdmin.from('tickets').update({ stripe_session_id: session.id }).eq('order_id', orderId);
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('[checkout] Stripe no pudo crear la sesión de pago:', e?.message ?? e);
    await supabaseAdmin.from('tickets').delete().eq('order_id', orderId).eq('status', 'pending');
    return fail('No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos.', 502);
  }
}

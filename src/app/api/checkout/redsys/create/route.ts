import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import {
  buildRedsysForm,
  generateRedsysOrderId,
  getRedsysConfig,
  RedsysNotConfiguredError
} from '@/lib/redsys';
import { createPendingTicket, expirePending } from '@/lib/stock-db';
import { upcomingCutoff } from '@/lib/stock';
import { addHit, clientIp, retryAfter } from '@/lib/ratelimit';
import { LEGAL } from '@/lib/legal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE = /^\+?[\d\s().-]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BUY_LIMIT = 8; // compras iniciadas por IP...
const BUY_WINDOW = 10 * 60_000; // ...cada 10 minutos (evita que alguien bloquee las entradas reservándolas en bucle)

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// El comprador elige tramo + noche y pone nombre y teléfono. Creamos la entrada como "pending"
// (sin valor hasta que el banco confirme el cobro) y lo redirigimos a Redsys. Cuando Redsys avisa a
// /notify, la entrada pasa a "valid"; si el pago falla o caduca, se anula y deja de ocupar plaza.
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
  const email = body?.buyer_email ? String(body.buyer_email).trim() : null;
  if (!UUID.test(tierId) || (requestedEvent && !UUID.test(requestedEvent))) return fail('Petición no válida', 400);
  if (name.length < 2 || name.length > 80) return fail('Escribe tu nombre', 400);
  if (!PHONE.test(phone)) return fail('Escribe un teléfono válido', 400);
  if (email && !EMAIL.test(email)) return fail('El email no es válido', 400);
  if (body?.accepted_terms !== true) return fail('Debes aceptar las condiciones de compra y la política de privacidad', 400);

  let config;
  try {
    config = getRedsysConfig();
  } catch (e) {
    if (e instanceof RedsysNotConfiguredError) {
      console.error('[checkout] pago online no disponible:', e.problems.join('; '));
      return fail('El pago online todavía no está disponible. Puedes comprar en taquilla o escribirnos por WhatsApp.', 503);
    }
    throw e;
  }

  await expirePending(true); // libera antes las plazas de compras abandonadas

  const { data: tier } = await supabaseAdmin.from('price_tiers').select('*').eq('id', tierId).single();
  if (!tier || !tier.is_active || tier.kind === 'door' || !(tier.price_cents > 0)) {
    return fail('Tramo de precio no disponible', 404);
  }

  // La noche: debe existir y estar publicada. Si hay noches publicadas, hay que elegir una.
  const { data: events } = await supabaseAdmin.from('events').select('id,event_date').eq('is_published', true);
  const eventId = requestedEvent ?? tier.event_id ?? null;
  if (eventId) {
    const night = events?.find((e) => e.id === eventId);
    if (!night) return fail('Esa noche no está disponible', 400);
    if (night.event_date < upcomingCutoff()) return fail('Esa noche ya ha pasado', 400);
    if (tier.event_id && tier.event_id !== eventId) return fail('Este tramo no es de esa noche', 400);
  } else if (events && events.length > 0) {
    return fail('Elige la noche', 400);
  }

  const orderId = generateRedsysOrderId();
  const ticketToken = crypto.randomBytes(16).toString('hex'); // 128 bits: la URL de la entrada no se puede adivinar

  // El formulario de pago se construye antes de tocar la base de datos (no la usa).
  const { url, fields } = buildRedsysForm(config, {
    orderId,
    ticketToken,
    amountCents: tier.price_cents,
    description: `Entrada Coyote Club - ${tier.label}`,
    buyerName: name
  });

  // Se guarda la entrada solo si queda sitio esa noche y en ese tramo (comprobación y alta en una sola operación atómica).
  let created;
  try {
    created = await createPendingTicket({
      event: eventId, tier: tier.id, qr: ticketToken, order: orderId, name, phone, email,
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

  return NextResponse.json({ url, fields });
}

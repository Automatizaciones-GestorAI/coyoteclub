import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildRedsysForm, generateRedsysOrderId } from '@/lib/redsys';

// El comprador rellena nombre + elige tramo -> creamos un ticket "pendiente" (sin QR aún)
// y redirigimos a Redsys. El QR se genera solo cuando el pago se confirma (ver /notify).
export async function POST(req: NextRequest) {
  const { tier_id, event_id, buyer_name, buyer_phone, buyer_email } = await req.json();

  const { data: tier, error: tierError } = await supabaseAdmin
    .from('price_tiers')
    .select('*')
    .eq('id', tier_id)
    .single();
  if (tierError || !tier) {
    return NextResponse.json({ error: 'Tramo de precio no encontrado' }, { status: 404 });
  }

  const orderId = generateRedsysOrderId();

  const { error: insertError } = await supabaseAdmin.from('tickets').insert({
    qr_code: orderId, // provisional: se sustituye por un token definitivo al confirmar el pago
    event_id: event_id || null,
    tier_id,
    buyer_name,
    buyer_phone,
    buyer_email,
    status: 'valid' // OJO: en producción, cambia el flujo para marcar "pending" hasta la notificación de Redsys
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { url, fields } = buildRedsysForm({
    orderId,
    amountCents: tier.price_cents,
    description: `Entrada Coyote Club - ${tier.label}`,
    buyerName: buyer_name
  });

  return NextResponse.json({ url, fields });
}

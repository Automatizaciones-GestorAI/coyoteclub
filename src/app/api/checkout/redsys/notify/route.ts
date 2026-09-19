import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getRedsysConfig, pick, verifyRedsysNotification } from '@/lib/redsys';

// Redsys llama a esta URL en segundo plano (servidor a servidor) tras cada intento de pago.
// Solo se hace caso a notificaciones con firma válida. Siempre se responde 200 cuando la firma es
// correcta (Redsys reintenta si no); si falla la base de datos se responde 500 para que reintente.
export async function POST(req: NextRequest) {
  let merchantParams = '';
  let signature = '';
  try {
    const form = await req.formData();
    merchantParams = String(form.get('Ds_MerchantParameters') ?? '');
    signature = String(form.get('Ds_Signature') ?? '');
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }

  let config;
  try {
    config = getRedsysConfig();
  } catch (e) {
    console.error('[notify] Redsys sin configurar, no se puede verificar la firma');
    return NextResponse.json({ error: 'No disponible' }, { status: 503 });
  }

  const decoded = verifyRedsysNotification(config, merchantParams, signature);
  if (!decoded) {
    console.warn('[notify] notificación con firma inválida descartada');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  const orderId = pick(decoded, 'Ds_Order') as string;
  const amount = parseInt(pick(decoded, 'Ds_Amount') ?? '', 10);
  const code = parseInt(pick(decoded, 'Ds_Response') ?? '', 10);
  const currency = pick(decoded, 'Ds_Currency');
  const paid = Number.isInteger(code) && code >= 0 && code <= 99; // 0000-0099 = autorizada, según Redsys

  let outcome: unknown;
  if (paid) {
    if (currency && currency !== '978') {
      console.error('[notify] moneda inesperada', { orderId, currency });
      return new NextResponse('OK', { status: 200 });
    }
    const { data, error } = await supabaseAdmin.rpc('confirm_ticket_payment', {
      p_order: orderId,
      p_amount: Number.isInteger(amount) ? amount : -1
    });
    if (error) {
      console.error('[notify] error confirmando el pago', { orderId, message: error.message });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
    outcome = data;
  } else {
    const { data, error } = await supabaseAdmin.rpc('fail_ticket_payment', { p_order: orderId });
    if (error) {
      console.error('[notify] error anulando la entrada', { orderId, message: error.message });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
    outcome = data;
  }

  const logLine = JSON.stringify({ evt: 'redsys_notify', orderId, paid, code, amount, outcome });
  // Estos resultados necesitan revisión humana (cobro que no cuadra o entrega sin plaza)
  if (outcome === 'amount_mismatch' || outcome === 'reactivated_oversold' || outcome === 'not_found') console.error(logLine);
  else console.log(logLine);

  return new NextResponse('OK', { status: 200 });
}

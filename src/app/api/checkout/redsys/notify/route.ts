import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getRedsysConfig, pick, verifyRedsysNotification } from '@/lib/redsys';

// Solo se guardan datos útiles para revisar un cobro (nunca el número de tarjeta).
const KEEP = ['Ds_Order', 'Ds_Amount', 'Ds_Currency', 'Ds_Response', 'Ds_AuthorisationCode', 'Ds_Date', 'Ds_Hour', 'Ds_Card_Brand', 'Ds_Card_Country', 'Ds_SecurePayment', 'Ds_TransactionType', 'Ds_ErrorCode'];
async function logNotice(decoded: Record<string, string>, outcome: string) {
  try {
    const raw: Record<string, string> = {};
    for (const k of KEEP) {
      const v = pick(decoded, k);
      if (v !== undefined) raw[k] = v;
    }
    const amount = parseInt(pick(decoded, 'Ds_Amount') ?? '', 10);
    await supabaseAdmin.from('payment_events').insert({
      order_id: pick(decoded, 'Ds_Order') ?? null,
      ds_response: pick(decoded, 'Ds_Response') ?? null,
      amount_cents: Number.isInteger(amount) ? amount : null,
      outcome,
      raw
    });
  } catch (e) {
    console.error('[notify] no se pudo guardar el aviso en payment_events', (e as Error).message);
  }
}

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
      await logNotice(decoded, 'bad_currency');
      return new NextResponse('OK', { status: 200 });
    }
    const { data, error } = await supabaseAdmin.rpc('confirm_ticket_payment', {
      p_order: orderId,
      p_amount: Number.isInteger(amount) ? amount : -1
    });
    if (error) {
      console.error('[notify] error confirmando el pago', { orderId, message: error.message });
      await logNotice(decoded, 'error');
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
    outcome = data;
  } else {
    const { data, error } = await supabaseAdmin.rpc('fail_ticket_payment', { p_order: orderId });
    if (error) {
      console.error('[notify] error anulando la entrada', { orderId, message: error.message });
      await logNotice(decoded, 'error');
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
    outcome = data;
  }

  await logNotice(decoded, String(outcome));
  const logLine = JSON.stringify({ evt: 'redsys_notify', orderId, paid, code, amount, outcome });
  // Estos resultados necesitan revisión humana (cobro que no cuadra o entrega sin plaza)
  if (outcome === 'amount_mismatch' || outcome === 'reactivated_oversold' || outcome === 'not_found') console.error(logLine);
  else console.log(logLine);

  return new NextResponse('OK', { status: 200 });
}

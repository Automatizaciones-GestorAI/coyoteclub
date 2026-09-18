import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyRedsysNotification } from '@/lib/redsys';
import crypto from 'crypto';

// Redsys llama a esta URL en segundo plano (server-to-server) tras el intento de pago.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const merchantParams = form.get('Ds_MerchantParameters') as string;
  const signature = form.get('Ds_Signature') as string;

  const decoded = verifyRedsysNotification(merchantParams, signature);
  if (!decoded) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  const orderId = decoded.Ds_Order;
  const responseCode = parseInt(decoded.Ds_Response, 10);
  const paid = responseCode >= 0 && responseCode <= 99; // 0-99 = autorizado, según Redsys

  if (paid) {
    // Pago confirmado: generamos el código QR definitivo para esta entrada
    const finalQr = crypto.randomBytes(16).toString('hex');
    await supabaseAdmin.from('tickets').update({ qr_code: finalQr }).eq('qr_code', orderId);
  } else {
    // Pago rechazado: anulamos la entrada provisional
    await supabaseAdmin.from('tickets').update({ status: 'cancelled' }).eq('qr_code', orderId);
  }

  return new NextResponse('OK', { status: 200 });
}

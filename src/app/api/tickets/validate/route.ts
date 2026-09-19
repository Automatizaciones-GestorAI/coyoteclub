import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let qr_code: unknown;
  try {
    ({ qr_code } = await req.json());
  } catch {
    return NextResponse.json({ valid: false, reason: 'Código no válido' });
  }
  if (typeof qr_code !== 'string' || qr_code.length > 200) {
    return NextResponse.json({ valid: false, reason: 'Código no válido' });
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select('*, events(title), price_tiers(label)')
    .eq('qr_code', qr_code)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ valid: false, reason: 'No existe esta entrada' });
  }
  if (ticket.status === 'used') {
    return NextResponse.json({ valid: false, reason: 'Ya se usó esta entrada', ticket });
  }
  if (ticket.status === 'cancelled') {
    return NextResponse.json({ valid: false, reason: 'Entrada cancelada', ticket });
  }
  if (ticket.status !== 'valid') {
    return NextResponse.json({ valid: false, reason: 'Pago pendiente: aún no confirmado', ticket });
  }

  // Se marca como usada solo si sigue "valid": si dos móviles la escanean a la vez, solo entra uno.
  const { data: updated, error: updError } = await supabaseAdmin
    .from('tickets')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', ticket.id)
    .eq('status', 'valid')
    .select('id');
  if (updError) {
    console.error('[validate]', updError.message);
    return NextResponse.json({ valid: false, reason: 'Error al validar, vuelve a escanear' });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ valid: false, reason: 'Ya se usó esta entrada', ticket });
  }

  return NextResponse.json({ valid: true, ticket });
}

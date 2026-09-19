import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const CANCEL_TEXT: Record<string, string> = {
  expired: 'Reserva caducada: no llegó el pago',
  payment_failed: 'Pago rechazado por el banco',
  refunded: 'Entrada devuelta (reembolsada)',
  manual: 'Entrada anulada por el club'
};

// Lo que necesita el portero (nunca el email ni el código QR completo)
function view(t: any) {
  return {
    id: t.id, buyer_name: t.buyer_name, buyer_phone: t.buyer_phone, status: t.status, cancel_reason: t.cancel_reason ?? null,
    order_id: t.order_id ?? null, amount_cents: t.amount_cents ?? null, created_at: t.created_at, paid_at: t.paid_at ?? null,
    used_at: t.used_at ?? null, tier: t.price_tiers?.label ?? null, event: t.events?.title ?? null
  };
}

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
    return NextResponse.json({ valid: false, reason: 'Este QR no corresponde a ninguna entrada' });
  }

  // Si no es válida, se adjunta lo que sabemos del banco para poder comprobarlo en el momento
  const invalid = async (reason: string) => {
    let bank: any[] = [];
    if (ticket.order_id) {
      const r = await supabaseAdmin.from('payment_events').select('ds_response, amount_cents, outcome, created_at').eq('order_id', ticket.order_id).order('created_at', { ascending: false }).limit(3);
      bank = r.data ?? [];
    }
    return NextResponse.json({ valid: false, reason, ticket: view(ticket), bank });
  };

  if (ticket.status === 'used') return invalid('Ya se usó esta entrada');
  if (ticket.status === 'cancelled') return invalid(CANCEL_TEXT[ticket.cancel_reason as string] ?? 'Entrada anulada');
  if (ticket.status !== 'valid') return invalid('Pago pendiente: el banco aún no lo ha confirmado');

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
    const { data: fresh } = await supabaseAdmin.from('tickets').select('*, events(title), price_tiers(label)').eq('id', ticket.id).single();
    return NextResponse.json({ valid: false, reason: 'Ya se usó esta entrada', ticket: view(fresh ?? ticket), bank: [] });
  }

  return NextResponse.json({ valid: true, ticket: view(ticket) });
}

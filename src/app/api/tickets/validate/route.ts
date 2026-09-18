import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { qr_code } = await req.json();

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

  await supabaseAdmin
    .from('tickets')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', ticket.id);

  return NextResponse.json({ valid: true, ticket });
}

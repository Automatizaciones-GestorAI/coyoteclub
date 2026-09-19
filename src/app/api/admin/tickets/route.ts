import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Acciones manuales del club sobre una entrada (o sobre un aviso del banco que hay que revisar).
export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }
  const id = String(body?.id ?? '');
  const action = String(body?.action ?? '');
  if (!UUID.test(id)) return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });

  let result: string | null = null;
  let error: { message: string } | null = null;

  if (action === 'mark_paid') ({ data: result, error } = await supabaseAdmin.rpc('admin_mark_ticket_paid', { p_ticket: id }));
  else if (action === 'cancel') ({ data: result, error } = await supabaseAdmin.rpc('admin_cancel_ticket', { p_ticket: id, p_reason: 'manual' }));
  else if (action === 'refund') ({ data: result, error } = await supabaseAdmin.rpc('admin_cancel_ticket', { p_ticket: id, p_reason: 'refunded' }));
  else if (action === 'let_in') ({ data: result, error } = await supabaseAdmin.rpc('admin_let_in', { p_ticket: id, p_note: typeof body?.note === 'string' ? body.note.slice(0, 200) : null }));
  else if (action === 'mark_used') ({ data: result, error } = await supabaseAdmin.rpc('admin_mark_ticket_used', { p_ticket: id }));
  else if (action === 'reviewed') {
    const r = await supabaseAdmin.from('tickets').update({ reviewed_at: new Date().toISOString() }).eq('id', id);
    error = r.error;
    result = 'reviewed';
  } else if (action === 'event_reviewed') {
    const r = await supabaseAdmin.from('payment_events').update({ reviewed_at: new Date().toISOString() }).eq('id', id);
    error = r.error;
    result = 'reviewed';
  } else {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  }

  if (error) {
    console.error('[admin/tickets]', action, error.message);
    return NextResponse.json({ error: 'No se pudo completar la acción' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result });
}

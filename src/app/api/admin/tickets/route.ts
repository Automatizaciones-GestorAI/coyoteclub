import { NextRequest, NextResponse } from 'next/server';
import { staffGuard } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { settlePaidSession } from '@/lib/payments';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Lo que puede hacer la puerta: dar entrada. Cobros, anulaciones y revisiones son del perfil admin.
const DOOR_ACTIONS = ['let_in', 'mark_used', 'check_payment'];

// Acciones manuales sobre una entrada (o sobre un aviso de pago que hay que revisar). Cada una queda anotada con quién la hizo.
export async function POST(req: NextRequest) {
  const { session, denied } = await staffGuard();
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
  if (session.role === 'door' && !DOOR_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'No tienes permiso para esto' }, { status: 403 });
  }
  const actor = session.username;

  let result: string | null = null;
  let error: { message: string } | null = null;

  if (action === 'mark_paid') ({ data: result, error } = await supabaseAdmin.rpc('admin_mark_ticket_paid', { p_ticket: id, p_actor: actor }));
  else if (action === 'cancel') ({ data: result, error } = await supabaseAdmin.rpc('admin_cancel_ticket', { p_ticket: id, p_reason: 'manual', p_actor: actor }));
  else if (action === 'refund') ({ data: result, error } = await supabaseAdmin.rpc('admin_cancel_ticket', { p_ticket: id, p_reason: 'refunded', p_actor: actor }));
  else if (action === 'let_in') ({ data: result, error } = await supabaseAdmin.rpc('admin_let_in', { p_ticket: id, p_note: typeof body?.note === 'string' ? body.note.slice(0, 200) : null, p_actor: actor }));
  else if (action === 'mark_used') ({ data: result, error } = await supabaseAdmin.rpc('admin_mark_ticket_used', { p_ticket: id, p_actor: actor }));
  else if (action === 'check_payment') {
    // Se PREGUNTA a Stripe si esa compra está cobrada. Si lo está, la entrada pasa a válida; Stripe es la fuente de verdad.
    const { data: t } = await supabaseAdmin.from('tickets').select('id, status, cancel_reason, stripe_session_id').eq('id', id).maybeSingle();
    if (!t) result = 'not_found';
    else if (t.status === 'valid' || t.status === 'used') result = 'already';
    else if (t.status === 'cancelled' && (t.cancel_reason === 'refunded' || t.cancel_reason === 'manual')) result = 'not_allowed';
    else if (!t.stripe_session_id) result = 'stripe_no_session';
    else {
      try {
        const s = await getStripe().checkout.sessions.retrieve(t.stripe_session_id);
        if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') {
          const r = await settlePaidSession(s, 'admin');
          result = r.outcome === 'amount_mismatch' ? 'stripe_mismatch' : 'stripe_confirmed';
        } else result = s.status === 'expired' ? 'stripe_expired' : 'stripe_open';
      } catch (e) {
        console.error('[admin/tickets] no se pudo consultar Stripe', (e as Error).message);
        result = 'stripe_error';
      }
    }
  } else if (action === 'reviewed') {
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

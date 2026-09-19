import { supabaseAdmin } from '@/lib/supabase';
import { CLUB_WHATSAPP, phoneToWhatsapp, siteBase, whatsappLink } from '@/lib/site';
import { ANOMALY_TEXT, getReviewItems } from '@/lib/review';
import AdminShell, { requireStaff } from '../AdminShell';
import { ReviewActions, TicketActions } from './Actions';

export const dynamic = 'force-dynamic';

const eur = (c: number | null | undefined) => (c == null ? '—' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c / 100));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

function chip(t: any): { label: string; cls: string } {
  if (t.status === 'valid') return { label: 'Válida', cls: 'chip-ok' };
  if (t.status === 'used') return { label: t.manual_override ? 'Usada (dada a mano)' : 'Usada', cls: 'chip-dim' };
  if (t.status === 'pending') return { label: 'Pendiente de pago', cls: 'chip-wait' };
  const why: Record<string, string> = { expired: 'Anulada · caducó sin pago', payment_failed: 'Anulada · pago rechazado', manual: 'Anulada por el club', refunded: 'Devuelta' };
  return { label: why[t.cancel_reason] ?? 'Anulada', cls: 'chip-off' };
}
const OUTCOME: Record<string, string> = {
  confirmed: 'Pago confirmado', already: 'Aviso repetido (ya estaba confirmado)', cancelled: 'Pago rechazado', reactivated: 'Pago tardío confirmado',
  reactivated_oversold: 'Pago tardío (sin plazas)', amount_mismatch: 'Importe distinto: NO activada', not_found: 'Pedido no encontrado', ignored: 'Aviso ignorado', error: 'Error al procesar', bad_currency: 'Moneda distinta'
};
const AUDIT: Record<string, string> = { mark_paid: 'Dada por pagada a mano', cancel: 'Anulada', mark_used: 'Marcada como usada', let_in: 'Dada entrada a mano en la puerta' };

export default async function EntradasPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await requireStaff();
  const isAdmin = session.role === 'admin';
  const { q = '', status = 'all' } = await searchParams;
  const clean = q.replace(/[^\p{L}\p{N} +.@_-]/gu, '').trim().slice(0, 40);
  const base = await siteBase();
  const review = isAdmin ? await getReviewItems() : { expired: [], events: [], manual: [] };
  const reviewCount = review.expired.length + review.events.length + review.manual.length;

  let query = supabaseAdmin.from('tickets').select('*, events(title, event_date), price_tiers(label)').order('created_at', { ascending: false }).limit(60);
  if (['pending', 'valid', 'used', 'cancelled'].includes(status)) query = query.eq('status', status);
  if (clean) query = query.or(`buyer_name.ilike.%${clean}%,buyer_phone.ilike.%${clean}%,order_id.ilike.%${clean}%`);
  const { data } = await query;
  const tickets: any[] = data ?? [];

  const orderIds = tickets.map((t) => t.order_id).filter(Boolean);
  const ids = tickets.map((t) => t.id);
  const [notices, audit] = await Promise.all([
    orderIds.length ? supabaseAdmin.from('payment_events').select('order_id, ds_response, amount_cents, outcome, created_at').in('order_id', orderIds).order('created_at') : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabaseAdmin.from('ticket_audit').select('ticket_id, action, detail, created_at').in('ticket_id', ids).order('created_at') : Promise.resolve({ data: [] as any[] })
  ]);
  const noticesBy = new Map<string, any[]>();
  for (const n of notices.data ?? []) noticesBy.set(n.order_id, [...(noticesBy.get(n.order_id) ?? []), n]);
  const auditBy = new Map<string, any[]>();
  for (const a of audit.data ?? []) auditBy.set(a.ticket_id, [...(auditBy.get(a.ticket_id) ?? []), a]);

  const waFor = (t: any, text: string) => whatsappLink(phoneToWhatsapp(t.buyer_phone), text);

  return (
    <AdminShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Entradas</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 14 }}>Busca a un cliente, comprueba su cobro, reenvíale la entrada o resuelve un problema en la puerta.</p>
        </div>

        {reviewCount > 0 && (
          <div className="card" style={{ borderColor: 'rgba(255,77,77,0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24 }}>⚠ Por revisar ({reviewCount})</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>Cosas que necesitan que alguien las mire. Compruébalas en el módulo de administración de Redsys buscando por el <b style={{ color: 'var(--text)' }}>número de pedido</b>.</p>
            </div>

            {review.expired.map((t: any) => (
              <div key={t.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <b>{t.buyer_name}</b> · {t.buyer_phone} · {t.price_tiers?.label} · {eur(t.amount_cents)}<br />
                  <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>La reserva caducó sin recibir la confirmación del banco. <b style={{ color: 'var(--text)' }}>¿Le cobraron?</b> Pedido <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{t.order_id}</span> · iniciada {when(t.created_at)}</span>
                </div>
                <ReviewActions kind="expired" id={t.id} amount={eur(t.amount_cents)} waUrl={waFor(t, `Hola ${t.buyer_name ?? ''}, te escribimos de Coyote Club sobre tu compra de entrada (pedido ${t.order_id}).`)} />
              </div>
            ))}
            {review.manual.map((t: any) => (
              <div key={t.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <b>{t.buyer_name}</b> · {t.buyer_phone} · {t.price_tiers?.label} · {eur(t.amount_cents)}<br />
                  <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Se le dio entrada a mano en la puerta ({when(t.used_at)}). <b style={{ color: 'var(--text)' }}>Comprueba que el pedido</b> <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{t.order_id}</span> <b style={{ color: 'var(--text)' }}>aparece cobrado en Redsys.</b></span>
                </div>
                <ReviewActions kind="manual" id={t.id} />
              </div>
            ))}
            {review.events.map((e: any) => (
              <div key={e.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <b>{ANOMALY_TEXT[e.outcome] ?? e.outcome}</b><br />
                  <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Pedido <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{e.order_id}</span> · código {e.ds_response ?? '—'} · {eur(e.amount_cents)} · {when(e.created_at)}</span>
                </div>
                <ReviewActions kind="event" id={e.id} />
              </div>
            ))}
          </div>
        )}

        <form method="get" className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label className="label" htmlFor="q">Buscar</label>
            <input id="q" name="q" defaultValue={clean} placeholder="Nombre, teléfono o nº de pedido" autoComplete="off" />
          </div>
          <div style={{ flex: '0 1 180px' }}>
            <label className="label" htmlFor="status">Estado</label>
            <select id="status" name="status" defaultValue={status}>
              <option value="all">Todas</option>
              <option value="valid">Válidas</option>
              <option value="used">Usadas</option>
              <option value="pending">Pendientes de pago</option>
              <option value="cancelled">Anuladas</option>
            </select>
          </div>
          <button className="btn" type="submit" style={{ minHeight: 44 }}>Buscar</button>
          {(clean || status !== 'all') && <a className="btn-outline btn-sm" href="/admin/entradas" style={{ minHeight: 44 }}>Limpiar</a>}
        </form>

        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{tickets.length === 0 ? 'No hay entradas con ese criterio.' : `${tickets.length} ${tickets.length === 1 ? 'entrada' : 'entradas'}${tickets.length === 60 ? ' (las 60 más recientes: afina la búsqueda)' : ''}`}</div>

        {tickets.map((t) => {
          const c = chip(t);
          const viewUrl = `${base}/ticket/${t.qr_code}`;
          const notes = noticesBy.get(t.order_id) ?? [];
          const log = auditBy.get(t.id) ?? [];
          return (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{t.buyer_name || 'Sin nombre'}</div>
                  <a href={`tel:${t.buyer_phone}`} style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>{t.buyer_phone || '—'}</a>
                </div>
                <span className={`chip ${c.cls}`}>{c.label}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                {t.price_tiers?.label ?? '—'} · {t.events?.title ?? 'Sin noche'} · <b style={{ color: 'var(--text)' }}>{eur(t.amount_cents)}</b><br />
                Pedido <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{t.order_id ?? '—'}</span> · iniciada {when(t.created_at)}
              </div>
              <TicketActions
                id={t.id} role={session.role} status={t.status} cancelReason={t.cancel_reason ?? null} viewUrl={viewUrl} amount={eur(t.amount_cents)}
                waUrl={waFor(t, `Hola ${(t.buyer_name ?? '').split(' ')[0]}, aquí tienes tu entrada de Coyote Club: ${viewUrl}`)}
              />
              <details>
                <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-dim)' }}>Ficha para verificar el cobro</summary>
                <div style={{ marginTop: 10, fontSize: 13, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Pedido (Redsys)</span><span style={{ fontFamily: 'monospace' }}>{t.order_id ?? '—'}</span>
                  <span style={{ color: 'var(--text-dim)' }}>Importe esperado</span><span>{eur(t.amount_cents)}</span>
                  <span style={{ color: 'var(--text-dim)' }}>Iniciada</span><span>{when(t.created_at)}</span>
                  <span style={{ color: 'var(--text-dim)' }}>Cobro confirmado</span><span>{t.paid_at ? when(t.paid_at) : 'no'}</span>
                  <span style={{ color: 'var(--text-dim)' }}>Entró</span><span>{t.used_at ? `${when(t.used_at)}${t.used_by ? ` · escaneada por ${t.used_by}` : ''}` : 'no'}</span>
                  <span style={{ color: 'var(--text-dim)' }}>Avisos del banco</span>
                  <span>
                    {notes.length === 0 ? <b style={{ color: '#ffbe3c' }}>ninguno recibido</b> : notes.map((n: any, i: number) => (
                      <span key={i} style={{ display: 'block' }}>{when(n.created_at)} · código {n.ds_response ?? '—'} · {eur(n.amount_cents)} · {OUTCOME[n.outcome] ?? n.outcome}</span>
                    ))}
                  </span>
                  {log.length > 0 && (<>
                    <span style={{ color: 'var(--text-dim)' }}>Acciones del club</span>
                    <span>{log.map((a: any, i: number) => (<span key={i} style={{ display: 'block' }}>{when(a.created_at)} · {AUDIT[a.action] ?? a.action}{a.actor ? ` · por ${a.actor}` : ''}{a.detail?.note ? ` (${a.detail.note})` : ''}</span>))}</span>
                  </>)}
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}

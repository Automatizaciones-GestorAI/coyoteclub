import { supabaseAdmin } from '@/lib/supabase';
import { availability } from '@/lib/stock';
import { getRedsysStatus } from '@/lib/redsys';
import { getLastBankNotice, getReviewCount } from '@/lib/review';
import AdminShell, { requireAdmin } from '../AdminShell';
import LiveControls from './LiveControls';
import SalesChart, { SalesDay } from './SalesChart';

export const dynamic = 'force-dynamic';

const eur = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const madridDay = (iso: string | Date) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }); // AAAA-MM-DD
const addDays = (day: string, n: number) => new Date(new Date(day + 'T12:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(day + 'T12:00:00Z').toLocaleDateString('es-ES', { ...opts, timeZone: 'UTC' });

type Evt = { id: string; title: string; event_date: string; event_time: string | null };

// PostgREST devuelve como mucho 1000 filas por petición: se pide por páginas para no truncar los totales.
async function fetchTickets(eventId: string) {
  const rows: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    let q = supabaseAdmin
      .from('tickets')
      .select('id,status,tier_id,event_id,amount_cents,created_at,paid_at')
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (eventId !== 'all') q = q.eq('event_id', eventId);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  await requireAdmin();
  const { event: requested } = await searchParams;

  const [{ data: eventsData }, { data: tiersData }] = await Promise.all([
    supabaseAdmin.from('events').select('id,title,event_date,event_time').order('event_date', { ascending: false }).limit(40),
    supabaseAdmin.from('price_tiers').select('*').order('sort_order')
  ]);
  const events: Evt[] = eventsData || [];
  const tiers: any[] = (tiersData || []).filter((t) => t.kind !== 'door');

  // Noche por defecto: la de hoy o la próxima. Hasta el mediodía siguiente sigue contando la noche que acaba de pasar.
  const cutoff = madridDay(new Date(Date.now() - 12 * 3600 * 1000));
  const upcoming = events.filter((e) => e.event_date >= cutoff).sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  const fallback = (upcoming ?? events[0])?.id ?? 'all';
  const selected = requested === 'all' || events.some((e) => e.id === requested) ? (requested as string) : fallback;
  const selectedEvent = events.find((e) => e.id === selected);

  const tickets = await fetchTickets(selected);
  const tierById = new Map(tiers.map((t) => [t.id, t]));
  const paid = tickets.filter((t) => t.status === 'valid' || t.status === 'used');
  const amountOf = (t: any) => t.amount_cents ?? tierById.get(t.tier_id)?.price_cents ?? 0;

  const revenue = paid.reduce((sum, t) => sum + amountOf(t), 0);
  const sold = paid.length;
  const entered = paid.filter((t) => t.status === 'used').length;
  const pending = tickets.filter((t) => t.status === 'pending').length;

  // Por tramo (los de taquilla no pasan por la web)
  const byTier = tiers.map((tier) => {
    const mine = paid.filter((t) => t.tier_id === tier.id);
    return { tier, count: mine.length, cents: mine.reduce((s, t) => s + amountOf(t), 0), state: availability(tier) };
  });

  // Por día: desde la primera venta hasta la noche (o hasta hoy, si aún no ha llegado)
  const perDay = new Map<string, { count: number; cents: number }>();
  for (const t of paid) {
    const day = madridDay(t.paid_at ?? t.created_at);
    const cur = perDay.get(day) ?? { count: 0, cents: 0 };
    cur.count++;
    cur.cents += amountOf(t);
    perDay.set(day, cur);
  }
  const days: SalesDay[] = [];
  if (perDay.size > 0) {
    const keys = [...perDay.keys()].sort();
    const today = madridDay(new Date());
    const last = selectedEvent ? [keys[keys.length - 1], selectedEvent.event_date < today ? selectedEvent.event_date : today].sort().pop()! : keys[keys.length - 1];
    let start = keys[0];
    if (addDays(start, 60) < last) start = addDays(last, -60); // como mucho 60 días
    for (let d = start; d <= last; d = addDays(d, 1)) {
      const v = perDay.get(d) ?? { count: 0, cents: 0 };
      days.push({ key: d, short: `${d.slice(8, 10)}/${d.slice(5, 7)}`, label: dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' }), ...v });
    }
  }

  const nights = events.map((e) => ({
    id: e.id,
    label: `${e.title} · ${dayLabel(e.event_date, { weekday: 'short', day: 'numeric', month: 'short' })}`
  }));
  const redsys = getRedsysStatus();
  const [lastNotice, toReview] = await Promise.all([getLastBankNotice(), getReviewCount()]);
  const noticeText = lastNotice ? new Date(lastNotice).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <AdminShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Ventas</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 14 }}>
            Entradas vendidas online{selectedEvent ? ` para ${selectedEvent.title}` : selected === 'all' ? ' en todas las noches' : ''}.
          </p>
        </div>

        <LiveControls nights={nights} selected={selected} />

        <div
          className="card"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderColor: redsys.ok ? 'rgba(46,204,113,0.5)' : 'rgba(255,190,60,0.5)' }}
        >
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1.2, color: redsys.ok ? '#2ecc71' : '#ffbe3c' }}>{redsys.ok ? '✔' : '⚠'}</span>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            <strong>Cobro online: {redsys.ok ? (redsys.mode === 'live' ? 'activo (modo real)' : 'listo en modo pruebas') : 'sin activar'}</strong>
            {redsys.ok ? (
              <div style={{ color: 'var(--text-dim)' }}>
                {redsys.mode === 'live' ? 'Los cobros son reales.' : 'Los cobros son de prueba: no se mueve dinero. Cuando el banco lo autorice, cambia REDSYS_ENV a live.'}
                <br />
                {noticeText ? `Último aviso recibido del banco: ${noticeText}.` : 'Todavía no ha llegado ningún aviso del banco: haz una compra de prueba para comprobar que las notificaciones llegan.'}
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)' }}>Falta configurar Redsys: {redsys.problems.join('; ')}. Hasta entonces nadie puede pagar online.</div>
            )}
          </div>
        </div>

        {toReview > 0 && (
          <a href="/admin/entradas" className="card" style={{ borderColor: 'rgba(255,77,77,0.6)', display: 'block', fontSize: 14 }}>
            <b>⚠ Hay {toReview} {toReview === 1 ? 'cobro por revisar' : 'cobros por revisar'}.</b> <span style={{ color: 'var(--text-dim)' }}>Pulsa aquí para verlos en «Entradas».</span>
          </a>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="label" style={{ margin: 0 }}>INGRESOS POR ENTRADAS</div>
          <div className="display" style={{ fontSize: 'clamp(48px, 12vw, 64px)', lineHeight: 1 }}>{eur(revenue)}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {sold > 0 ? `${sold} ${sold === 1 ? 'entrada cobrada' : 'entradas cobradas'} · ${eur(Math.round(revenue / sold))} de media` : 'Todavía no hay entradas cobradas'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 16 }}>
          <div className="card">
            <div className="label">ENTRADAS VENDIDAS</div>
            <div className="display" style={{ fontSize: 40 }}>{sold}</div>
          </div>
          <div className="card">
            <div className="label">HAN ENTRADO</div>
            <div className="display" style={{ fontSize: 40 }}>{entered}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{sold > 0 ? `${Math.round((entered / sold) * 100)}% de las vendidas` : '—'}</div>
          </div>
          <div className="card">
            <div className="label">PENDIENTES DE PAGO</div>
            <div className="display" style={{ fontSize: 40 }}>{pending}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Se anulan solas si no pagan</div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Por tramo</h2>
          <div className="table-wrap">
            <table className="table stack">
              <thead>
                <tr>
                  <th>Tramo</th>
                  <th className="num">Vendidas</th>
                  <th className="num">Importe</th>
                  <th className="num">Quedan</th>
                </tr>
              </thead>
              <tbody>
                {byTier.map(({ tier, count, cents, state }) => (
                  <tr key={tier.id}>
                    <td data-label="Tramo" className="stack-title">{tier.label}</td>
                    <td data-label="Vendidas" className="num">{count}</td>
                    <td data-label="Importe" className="num">{eur(cents)}</td>
                    <td data-label="Quedan" className="num">
                      {tier.stock === null || tier.stock === undefined ? (
                        <span style={{ color: 'var(--text-dim)' }}>Sin límite</span>
                      ) : (
                        <>
                          {tier.stock} {state === 'low' && <span className="badge-low badge-xs">Pocas</span>}
                          {state === 'soldout' && <span className="badge-low badge-xs badge-red">Agotado</span>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
            «Quedan» es lo que queda ahora a la venta online de cada tramo. Lo que se cobre en taquilla no pasa por la web y no aparece aquí.
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>Entradas vendidas por día</h2>
          {days.length > 0 ? (
            <SalesChart days={days} />
          ) : (
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 14 }}>Cuando se venda la primera entrada aparecerá aquí la evolución día a día.</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

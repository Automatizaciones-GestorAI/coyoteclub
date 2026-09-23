import { supabaseAdmin } from '@/lib/supabase';
import AdminShell, { requireAdmin } from '../AdminShell';
import VisitsChart, { VisitDay } from './VisitsChart';

export const dynamic = 'force-dynamic';

const madridDay = (iso: string | Date) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }); // AAAA-MM-DD
const addDays = (day: string, n: number) => new Date(new Date(day + 'T12:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(day + 'T12:00:00Z').toLocaleDateString('es-ES', { ...opts, timeZone: 'UTC' });

const PATH_NAMES: Record<string, string> = { '/': 'Portada', '/entradas': 'Entradas' };
const LABEL_NAMES: Record<string, string> = {
  nav_entradas: 'Entradas (menú de arriba)',
  hero_entradas: 'Entradas (botón grande del hero)',
  card_entradas: 'Entradas (tarjeta de una noche)',
  whatsapp_nav: 'WhatsApp (menú de arriba)',
  whatsapp_footer: 'WhatsApp (Cómo llegar)',
  mapa: 'Ver mapa interactivo'
};

type Row = { kind: 'pageview' | 'click'; path: string | null; label: string | null; created_at: string };

// PostgREST devuelve como mucho 1000 filas por petición: se pide por páginas para no truncar los totales.
async function fetchEvents(sinceIso: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from('site_events')
      .select('kind,path,label,created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < 1000) break;
  }
  return rows;
}

export default async function SeguimientoPage() {
  await requireAdmin();

  const today = madridDay(new Date());
  const since = addDays(today, -29); // 30 días (incluido hoy)
  const rows = await fetchEvents(`${since}T00:00:00Z`);

  const dayOf = (r: Row) => madridDay(r.created_at);
  const inLast = (r: Row, days: number) => dayOf(r) >= addDays(today, -(days - 1));

  // Visitas por página: hoy / 7 días / 30 días
  const pageviews = rows.filter((r) => r.kind === 'pageview' && r.path);
  const pathCounts = (days: number) => {
    const acc: Record<string, number> = {};
    for (const r of pageviews) if (inLast(r, days)) acc[r.path!] = (acc[r.path!] ?? 0) + 1;
    return acc;
  };
  const paths = Array.from(new Set(pageviews.map((r) => r.path!))).sort();
  const p1 = pathCounts(1);
  const p7 = pathCounts(7);
  const p30 = pathCounts(30);
  const totalToday = paths.reduce((s, p) => s + (p1[p] ?? 0), 0);
  const total7 = paths.reduce((s, p) => s + (p7[p] ?? 0), 0);
  const total30 = paths.reduce((s, p) => s + (p30[p] ?? 0), 0);

  // Clics por botón: hoy / 7 días / 30 días
  const clicks = rows.filter((r) => r.kind === 'click' && r.label);
  const labelCounts = (days: number) => {
    const acc: Record<string, number> = {};
    for (const r of clicks) if (inLast(r, days)) acc[r.label!] = (acc[r.label!] ?? 0) + 1;
    return acc;
  };
  const labels = Array.from(new Set(clicks.map((r) => r.label!)));
  const c1 = labelCounts(1);
  const c7 = labelCounts(7);
  const c30 = labelCounts(30);

  // Últimos 14 días para el gráfico (solo visitas, cualquier página)
  const chartDays: VisitDay[] = [];
  for (let day = addDays(today, -13); day <= today; day = addDays(day, 1)) {
    const count = pageviews.filter((r) => dayOf(r) === day).length;
    chartDays.push({ key: day, short: day.slice(8, 10), label: dayLabel(day, { weekday: 'long', day: 'numeric', month: 'long' }), count });
  }

  return (
    <AdminShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Seguimiento</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 14 }}>
            Cuántas visitas recibe la web y cuántos clics se dan en los botones importantes. No se guarda IP, ni
            nombre, ni nada que identifique a quien visita — solo el conteo, por eso la web no necesita aviso de
            cookies para esto.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 16 }}>
          <div className="card">
            <div className="label">VISITAS HOY</div>
            <div className="display" style={{ fontSize: 40 }}>{totalToday}</div>
          </div>
          <div className="card">
            <div className="label">ÚLTIMOS 7 DÍAS</div>
            <div className="display" style={{ fontSize: 40 }}>{total7}</div>
          </div>
          <div className="card">
            <div className="label">ÚLTIMOS 30 DÍAS</div>
            <div className="display" style={{ fontSize: 40 }}>{total30}</div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 22, margin: '0 0 4px' }}>Visitas por día</h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Últimos 14 días, portada y entradas juntas.</div>
          <VisitsChart days={chartDays} />
        </div>

        {paths.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 22, margin: '0 0 16px' }}>Visitas por página</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Página</th>
                    <th className="num">Hoy</th>
                    <th className="num">7 días</th>
                    <th className="num">30 días</th>
                  </tr>
                </thead>
                <tbody>
                  {paths.map((p) => (
                    <tr key={p}>
                      <td>{PATH_NAMES[p] ?? p}</td>
                      <td className="num">{p1[p] ?? 0}</td>
                      <td className="num">{p7[p] ?? 0}</td>
                      <td className="num">{p30[p] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: 22, margin: '0 0 4px' }}>Clics en botones clave</h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
            Entradas (que llevan a comprar) y WhatsApp / mapa (contacto y cómo llegar).
          </div>
          {labels.length === 0 ? (
            <p style={{ color: 'var(--text-dim)' }}>Todavía no hay clics registrados.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Botón</th>
                    <th className="num">Hoy</th>
                    <th className="num">7 días</th>
                    <th className="num">30 días</th>
                  </tr>
                </thead>
                <tbody>
                  {labels
                    .sort((a, b) => (c30[b] ?? 0) - (c30[a] ?? 0))
                    .map((l) => (
                      <tr key={l}>
                        <td>{LABEL_NAMES[l] ?? l}</td>
                        <td className="num">{c1[l] ?? 0}</td>
                        <td className="num">{c7[l] ?? 0}</td>
                        <td className="num">{c30[l] ?? 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

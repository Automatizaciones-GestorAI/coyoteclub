import { supabaseAdmin } from '@/lib/supabase';
import AdminShell, { requireAdmin } from './AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  await requireAdmin();
  const { count: eventsCount } = await supabaseAdmin
    .from('events')
    .select('*', { count: 'exact', head: true });
  const { count: ticketsCount } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'valid');
  const { count: usedCount } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'used');

  return (
    <AdminShell>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Resumen</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 700 }}>
        <div className="card">
          <div className="label">EVENTOS ACTIVOS</div>
          <div className="display" style={{ fontSize: 40 }}>{eventsCount ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">ENTRADAS SIN USAR</div>
          <div className="display" style={{ fontSize: 40 }}>{ticketsCount ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">ENTRADAS VALIDADAS</div>
          <div className="display" style={{ fontSize: 40 }}>{usedCount ?? 0}</div>
        </div>
      </div>
    </div>
    </AdminShell>
  );
}

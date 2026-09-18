import { supabaseAdmin } from '@/lib/supabase';
import QRCode from 'qrcode';

export default async function TicketPage({ params }: { params: { id: string } }) {
  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('*, events(title, event_date, event_time), price_tiers(label, description)')
    .eq('qr_code', params.id)
    .single();

  if (!ticket) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>Entrada no encontrada.</p>
      </div>
    );
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.qr_code, {
    margin: 1,
    width: 260,
    color: { dark: '#0b0b0c', light: '#ffffff' }
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.16), transparent 55%), var(--bg)' }}>
      <div
        className="card"
        style={{
          width: 340,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          border: '1px solid var(--line)',
          boxShadow: '0 0 40px rgba(255,20,156,0.18)'
        }}
      >
        <div className="display" style={{ fontSize: 30 }}>
          COYOTE <span style={{ color: 'var(--accent)' }}>CLUB</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Seseña Viejo, Toledo</div>

        {ticket.status !== 'valid' && (
          <div style={{ color: '#ff6b6b', fontSize: 13, fontWeight: 700 }}>
            {ticket.status === 'used' ? 'ENTRADA YA USADA' : 'ENTRADA CANCELADA'}
          </div>
        )}

        <img src={qrDataUrl} alt="Código QR de la entrada" style={{ borderRadius: 12, alignSelf: 'center' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{ticket.events?.title || 'Coyote Club'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {ticket.events?.event_date} {ticket.events?.event_time}
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
            {ticket.price_tiers?.label}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Muestra este QR en la entrada</div>
      </div>
    </div>
  );
}

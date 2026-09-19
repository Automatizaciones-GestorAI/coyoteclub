import { supabaseAdmin } from '@/lib/supabase';
import QRCode from 'qrcode';
import AutoRefresh from './AutoRefresh';

export const dynamic = 'force-dynamic';

const shell = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.16), transparent 55%), var(--bg)'
} as const;

function Message({ title, text, refresh, cta }: { title: string; text: string; refresh?: boolean; cta?: boolean }) {
  return (
    <div style={shell}>
      {/* Mientras el banco no confirma, la página se actualiza sola cada pocos segundos */}
      {refresh && <AutoRefresh />}
      <div className="card" style={{ width: 'min(340px, 100%)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <img src="/images/logo.png" alt="Coyote Club" style={{ display: 'block', width: 'min(200px, 70%)', height: 'auto', margin: '0 auto' }} />
        <div className="display" style={{ fontSize: 28 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>{text}</div>
        {cta && (
          <a href="/entradas" className="btn" style={{ marginTop: 6 }}>Volver a entradas</a>
        )}
      </div>
    </div>
  );
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('*, events(title, event_date, event_time), price_tiers(label, description)')
    .eq('qr_code', id)
    .single();

  if (!ticket) {
    return <Message title="Entrada no encontrada" text="Revisa el enlace que recibiste. Si acabas de pagar, espera un momento y vuelve a abrirlo." />;
  }
  if (ticket.status === 'pending') {
    return <Message refresh title="Confirmando tu pago…" text="Estamos esperando la confirmación del banco. No cierres esta página: tu entrada aparecerá aquí en unos segundos." />;
  }
  if (ticket.status === 'cancelled') {
    return <Message cta title="Pago no completado" text="No se ha realizado ningún cobro y esta entrada no es válida. Puedes volver a intentarlo cuando quieras." />;
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.qr_code, {
    margin: 1,
    width: 260,
    color: { dark: '#0b0b0c', light: '#ffffff' }
  });
  const used = ticket.status === 'used';

  return (
    <div style={shell}>
      <div
        className="card"
        style={{
          width: 'min(340px, 100%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          border: '1px solid var(--line)',
          boxShadow: '0 0 40px rgba(255,20,156,0.18)'
        }}
      >
        <img src="/images/logo.png" alt="Coyote Club" style={{ display: 'block', width: 'min(200px, 70%)', height: 'auto', margin: '0 auto' }} />
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Seseña Viejo, Toledo</div>

        {used && (
          <div style={{ color: '#ff6b6b', fontSize: 13, fontWeight: 700 }}>ENTRADA YA USADA</div>
        )}

        <img
          src={qrDataUrl}
          alt="Código QR de la entrada"
          style={{ borderRadius: 12, alignSelf: 'center', opacity: used ? 0.35 : 1 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{ticket.events?.title || 'Coyote Club'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {ticket.events?.event_date} {ticket.events?.event_time}
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
            {ticket.price_tiers?.label}
          </div>
          {ticket.buyer_name && (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{ticket.buyer_name}</div>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Muestra este QR en la entrada. Guarda esta página o haz una captura de pantalla: no podemos enviártela por otro medio.
        </div>
      </div>
    </div>
  );
}

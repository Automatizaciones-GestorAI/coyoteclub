import { supabaseAdmin } from '@/lib/supabase';
import { CLUB_WHATSAPP, siteBase, whatsappLink } from '@/lib/site';
import QRCode from 'qrcode';
import AutoRefresh from './AutoRefresh';
import CopyLink from './CopyLink';
import { LegalLinks } from '../../_legal/Bits';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Tu entrada · Coyote Club' };

const shell = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.16), transparent 55%), var(--bg)'
} as const;

function Message({ title, text, refresh, cta, help }: { title: string; text: string; refresh?: boolean; cta?: boolean; help?: { text: string; href: string } }) {
  return (
    <div style={shell}>
      {/* Mientras el pago no se confirma, la página se actualiza sola cada pocos segundos */}
      {refresh && <AutoRefresh />}
      <div className="card" style={{ width: 'min(340px, 100%)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <img src="/images/logo.webp" alt="Coyote Club" style={{ display: 'block', width: 'min(200px, 70%)', height: 'auto', margin: '0 auto' }} />
        <div className="display" style={{ fontSize: 28 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>{text}</div>
        {help && (
          <div style={{ border: '1px solid rgba(255,190,60,0.5)', background: 'rgba(255,190,60,0.08)', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5, textAlign: 'left' }}>
            {help.text}
            <a href={help.href} target="_blank" rel="noopener" className="btn btn-sm" style={{ marginTop: 10, display: 'flex' }}>Escribir por WhatsApp</a>
          </div>
        )}
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

  const url = `${await siteBase()}/ticket/${ticket.qr_code}`;
  const minutes = (Date.now() - new Date(ticket.created_at).getTime()) / 60000;
  // Mensaje para el cliente que dice haber pagado: lleva su pedido para que el club lo localice enseguida
  const helpHref = whatsappLink(CLUB_WHATSAPP, `Hola, he pagado mi entrada de Coyote Club y no me aparece. Nombre: ${ticket.buyer_name ?? ''}. Pedido: ${ticket.order_id ?? ''}. Enlace: ${url}`);

  if (ticket.status === 'pending') {
    return (
      <Message
        refresh
        title="Confirmando tu pago…"
        text="Estamos esperando la confirmación del pago. No cierres esta página: tu entrada aparecerá aquí en unos segundos."
        help={minutes >= 3 ? { text: 'Está tardando más de lo normal. Si ya te han cobrado, no pagues otra vez: guarda este enlace y escríbenos con tu nombre y la hora del pago. Te damos tu entrada enseguida.', href: helpHref } : undefined}
      />
    );
  }

  if (ticket.status === 'cancelled') {
    const reason = ticket.cancel_reason as string | null;
    if (reason === 'payment_failed') {
      return <Message cta title="Pago no completado" text="El pago no se ha completado, así que no se te ha cobrado nada. Puedes volver a intentarlo cuando quieras." />;
    }
    if (reason === 'refunded') {
      return <Message title="Entrada devuelta" text="Esta entrada se ha devuelto y el importe se reembolsará por el mismo medio de pago. Si tienes dudas, escríbenos." help={{ text: 'Cualquier duda, estamos en WhatsApp.', href: helpHref }} />;
    }
    if (reason === 'manual') {
      return <Message title="Entrada anulada" text="Esta entrada ha sido anulada por el club. Si crees que es un error, escríbenos." help={{ text: 'Cuéntanos qué ha pasado.', href: helpHref }} />;
    }
    // Caducada sin recibir confirmación del pago (o anulaciones antiguas sin motivo): NO se puede asegurar que no se cobrara
    return (
      <Message
        title="No hemos recibido tu pago"
        text="No nos ha llegado la confirmación del pago y esta entrada no es válida todavía."
        help={{ text: 'Si SÍ te han cobrado, no te preocupes: escríbenos con tu nombre y la hora del pago y te damos tu entrada o te devolvemos el dinero. No pagues otra vez.', href: helpHref }}
        cta
      />
    );
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.qr_code, {
    margin: 1,
    width: 260,
    color: { dark: '#0b0b0c', light: '#ffffff' }
  });
  const used = ticket.status === 'used';
  const shareHref = whatsappLink(null, `Mi entrada de Coyote Club: ${url}`);

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
        <img src="/images/logo.webp" alt="Coyote Club" style={{ display: 'block', width: 'min(200px, 70%)', height: 'auto', margin: '0 auto' }} />
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
          Muestra este QR en la entrada.
        </div>
        {!used && (
          <div style={{ border: '1px solid rgba(255,190,60,0.5)', background: 'rgba(255,190,60,0.08)', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5, textAlign: 'left' }}>
            <b style={{ color: '#ffcf6b' }}>⚠ Guarda esta entrada ahora</b>
            <div style={{ marginTop: 4 }}>
              Envíatela por WhatsApp o haz una captura de pantalla. Si pierdes el enlace, no podemos volver a mandártelo solos: tendrías que escribirnos por WhatsApp con tu nombre y el número de pedido.
            </div>
            <div className="actions" style={{ marginTop: 10 }}>
              <a href={shareHref} target="_blank" rel="noopener" className="btn btn-sm">Enviármela por WhatsApp</a>
              <CopyLink url={url} />
            </div>
          </div>
        )}
        <LegalLinks />
      </div>
    </div>
  );
}

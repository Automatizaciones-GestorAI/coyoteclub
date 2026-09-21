'use client';
import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import { legalLinksHtml, paymentLogosHtml } from '@/lib/legal-ui';

type Tier = {
  id: string;
  label: string;
  description: string | null;
  price_cents: number;
  kind: 'online' | 'door' | 'standing';
  event_id: string | null;
  availability: 'ok' | 'low' | 'soldout';
  nights: Record<string, 'ok' | 'low' | 'soldout'>; // estado de este tramo en cada noche
};
type Evt = { id: string; title: string; event_date: string; event_time: string | null };

export default function EntradasClient({ tiers, events, paymentFailed, paymentUnknown, noUpcoming }: { tiers: Tier[]; events: Evt[]; paymentFailed?: boolean; paymentUnknown?: boolean; noUpcoming?: boolean }) {
  const [openTier, setOpenTier] = useState<Tier | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventId, setEventId] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function openBuy(tier: Tier) {
    setOpenTier(tier);
    setName('');
    setPhone('');
    setEventId(tier.event_id || '');
    setAccepted(false);
    setError('');
  }

  async function submitPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!openTier) return;
    if (!accepted) {
      setError('Marca la casilla para aceptar las condiciones de compra y la política de privacidad.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier_id: openTier.id,
        event_id: eventId || null,
        buyer_name: name,
        buyer_phone: phone,
        accepted_terms: true
      })
    });
    let json: any = {};
    try {
      json = await res.json();
    } catch {
      /* respuesta que no es JSON: se muestra el mensaje genérico */
    }

    if (!res.ok) {
      setLoading(false);
      setError(json.error || 'No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos.');
      return;
    }

    // Lleva al cliente a la página de pago segura de Stripe (allí se le pide también su email para el recibo)
    window.location.href = json.url;
  }

  // Noches que se ofrecen para el tramo abierto: las suyas si es de una noche concreta, o todas las que se pueden comprar.
  const nightsForTier = openTier ? events.filter((ev) => !openTier.event_id || ev.id === openTier.event_id) : [];

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(28px, 8vw, 64px) 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.14), transparent 55%), var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <a href="/" aria-label="Coyote Club - Inicio" style={{ display: 'inline-block', marginBottom: 20 }}>
          <img src="/images/logo.png" alt="Coyote Club" style={{ display: 'block', width: 'min(200px, 60vw)', height: 'auto' }} />
        </a>
        <div className="display" style={{ fontSize: 'clamp(38px, 11vw, 48px)' }}>ENTRADAS</div>
        {paymentUnknown && (
          <div role="alert" style={{ margin: '16px auto 0', maxWidth: 480, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,190,60,0.6)', background: 'rgba(255,190,60,0.1)', color: '#ffcf6b', fontSize: 14, lineHeight: 1.5 }}>
            No hemos podido comprobar tu pago ahora mismo. Si te han cobrado, no pagues otra vez: escríbenos por WhatsApp con tu nombre y teléfono y te damos tu entrada enseguida.
          </div>
        )}
        {paymentFailed && (
          <div role="alert" style={{ margin: '16px auto 0', maxWidth: 480, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,107,107,0.5)', background: 'rgba(255,107,107,0.1)', color: '#ff9b9b', fontSize: 14, lineHeight: 1.5 }}>
            El pago no se ha completado y no se ha cobrado nada. Puedes volver a intentarlo cuando quieras.
          </div>
        )}
        <p style={{ color: 'var(--text-dim)', maxWidth: 480, margin: '12px auto 0' }}>
          Asegura tu entrada online. El precio sube según se acerca la fecha, así que cuanto antes
          la compres, menos pagas.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 20, width: '100%', maxWidth: 1100 }}>
        {tiers.map((tier) => (
          <div key={tier.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: tier.availability === 'soldout' || noUpcoming ? 0.6 : 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6, minHeight: 26 }}>
                <div className="label" style={{ margin: 0, color: tier.kind === 'door' ? 'var(--text-dim)' : 'var(--accent)' }}>
                  {tier.label}
                </div>
                {tier.availability === 'low' && <span className="badge-low">Quedan pocas</span>}
              </div>
              <div className="display" style={{ fontSize: 44 }}>
                {formatPrice(tier.price_cents)}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{tier.description}</div>
            </div>
            {tier.kind === 'door' ? (
              <div className="btn-outline" style={{ textAlign: 'center' }}>Pago en caja</div>
            ) : noUpcoming ? (
              <div className="btn-outline" style={{ textAlign: 'center' }}>Próximamente</div>
            ) : tier.availability === 'soldout' ? (
              <div className="btn-outline" style={{ textAlign: 'center' }}>Agotado</div>
            ) : (
              <button className="btn" onClick={() => openBuy(tier)}>
                {tier.kind === 'standing' ? 'Comprar' : 'Comprar entrada'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
        <span dangerouslySetInnerHTML={{ __html: paymentLogosHtml() }} />
        <span>Pago seguro con Stripe · Precios con IVA incluido</span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: legalLinksHtml() }} />

      {openTier && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: 16, zIndex: 50 }}
          onClick={() => setOpenTier(null)}
        >
          <form
            onSubmit={submitPurchase}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: 'min(340px, 100%)', margin: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div className="display" style={{ fontSize: 24 }}>
              {openTier.label} — {formatPrice(openTier.price_cents)}
            </div>
            <div>
              <label className="label">Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            {nightsForTier.length > 0 && (
              <div>
                <label className="label">Noche</label>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)} required>
                  <option value="" disabled>Elige la noche</option>
                  {nightsForTier.map((ev) => {
                    const st = openTier.nights[ev.id];
                    return (
                      <option key={ev.id} value={ev.id} disabled={st === 'soldout'}>
                        {ev.title} ({ev.event_date}){st === 'soldout' ? ' · Agotada' : st === 'low' ? ' · Quedan pocas' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.5, color: 'var(--text-dim)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                required
                style={{ width: 20, height: 20, padding: 0, marginTop: 1, flex: 'none', accentColor: 'var(--accent)' }}
              />
              <span>
                He leído y acepto las{' '}
                <a href="/condiciones" target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>condiciones de compra</a> y la{' '}
                <a href="/privacidad" target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>política de privacidad</a>. Sé que las entradas{' '}
                <strong style={{ color: 'var(--text)' }}>no admiten devolución</strong> salvo que se cancele el evento.
              </span>
            </label>
            {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-dim)' }}>
              <span dangerouslySetInnerHTML={{ __html: paymentLogosHtml() }} />
              <span>Pago seguro · IVA incluido</span>
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Redirigiendo a pago…' : 'Ir a pagar'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setOpenTier(null)}>
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

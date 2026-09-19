'use client';
import { useState } from 'react';

type Tier = {
  id: string;
  label: string;
  description: string | null;
  price_cents: number;
  kind: 'online' | 'door' | 'standing';
  event_id: string | null;
};
type Evt = { id: string; title: string; event_date: string; event_time: string | null };

export default function EntradasClient({ tiers, events }: { tiers: Tier[]; events: Evt[] }) {
  const [openTier, setOpenTier] = useState<Tier | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function openBuy(tier: Tier) {
    setOpenTier(tier);
    setName('');
    setPhone('');
    setEventId(tier.event_id || '');
    setError('');
  }

  async function submitPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!openTier) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/checkout/redsys/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier_id: openTier.id,
        event_id: eventId || null,
        buyer_name: name,
        buyer_phone: phone
      })
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'No se pudo iniciar el pago');
      return;
    }

    // Redirige a Redsys enviando un formulario auto-generado (así lo exige su pasarela)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = json.url;
    for (const [key, value] of Object.entries(json.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(28px, 8vw, 64px) 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.14), transparent 55%), var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <a href="/" aria-label="Coyote Club - Inicio" style={{ display: 'inline-block', marginBottom: 20 }}>
          <img src="/images/logo.png" alt="Coyote Club" style={{ display: 'block', width: 'min(200px, 60vw)', height: 'auto' }} />
        </a>
        <div className="display" style={{ fontSize: 'clamp(38px, 11vw, 48px)' }}>ENTRADAS</div>
        <p style={{ color: 'var(--text-dim)', maxWidth: 480, margin: '12px auto 0' }}>
          Asegura tu entrada online. El precio sube según se acerca la fecha, así que cuanto antes
          la compres, menos pagas.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 20, width: '100%', maxWidth: 1100 }}>
        {tiers.map((tier) => (
          <div key={tier.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="label" style={{ color: tier.kind === 'door' ? 'var(--text-dim)' : 'var(--accent)' }}>
                {tier.label}
              </div>
              <div className="display" style={{ fontSize: 44 }}>
                {(tier.price_cents / 100).toFixed(2).replace('.00', '')} €
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{tier.description}</div>
            </div>
            {tier.kind === 'door' ? (
              <div className="btn-outline" style={{ textAlign: 'center' }}>Pago en caja</div>
            ) : (
              <button className="btn" onClick={() => openBuy(tier)}>
                {tier.kind === 'standing' ? 'Comprar' : 'Comprar entrada'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Pago seguro con tarjeta · Redsys</div>

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
              {openTier.label} — {(openTier.price_cents / 100).toFixed(2)} €
            </div>
            <div>
              <label className="label">Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            {events.length > 0 && (
              <div>
                <label className="label">Noche</label>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  <option value="">— General —</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.event_date})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
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

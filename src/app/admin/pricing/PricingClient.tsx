'use client';
import { useState } from 'react';
import { LOW_STOCK } from '@/lib/stock';

type Tier = {
  id: string;
  label: string;
  description: string | null;
  price_cents: number;
  kind: string;
  is_active: boolean;
  sort_order: number;
  night_limit?: number | null;
};

const EMPTY = { label: '', description: '', price: '', kind: 'online', night_limit: '' };
const euros = (v: string) => Number(String(v).trim().replace(',', '.'));

export default function PricingClient({ initialTiers, stats }: { initialTiers: Tier[]; stats: Record<string, { label: string; n: number }[]> }) {
  const [tiers, setTiers] = useState(initialTiers);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);

  async function updateTier(tier: Tier, changes: Partial<Tier>) {
    const updated = { ...tier, ...changes };
    setTiers((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
    await fetch(`/api/admin/pricing/${tier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  }

  function saveLimit(tier: Tier, raw: string) {
    const value = raw.trim();
    const next = value === '' ? null : Math.max(0, Math.floor(Number(value)));
    if (next !== null && !Number.isFinite(next)) return;
    if (next === (tier.night_limit ?? null)) return;
    updateTier(tier, { night_limit: next });
  }

  async function addTier(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    const price = euros(form.price);
    if (!Number.isFinite(price) || price <= 0) return setNotice('Escribe un precio válido, por ejemplo 10 o 12,50.');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: form.label, description: form.description, price_cents: Math.round(price * 100), kind: form.kind, night_limit: form.kind === 'door' ? null : form.night_limit })
      });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'No se pudo crear el tramo.');
      else {
        setTiers((prev) => [...prev, json]);
        setForm(EMPTY);
        setOpen(false);
        setNotice(`Tramo «${json.label}» creado. Ya se ve en la web.`);
      }
    } catch {
      setNotice('Sin conexión. Vuelve a intentarlo.');
    }
    setBusy(false);
  }

  async function deleteTier(tier: Tier) {
    if (!window.confirm(`¿Borrar el tramo «${tier.label}»?\n\nDejará de verse en la web. Esta acción no se puede deshacer.`)) return;
    setNotice('');
    try {
      const res = await fetch(`/api/admin/pricing/${tier.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'No se pudo borrar el tramo.');
      else {
        setTiers((prev) => prev.filter((t) => t.id !== tier.id));
        setNotice(`Tramo «${tier.label}» borrado.`);
      }
    } catch {
      setNotice('Sin conexión. Vuelve a intentarlo.');
    }
  }

  // Sube o baja un tramo intercambiando su posición con el vecino
  async function move(index: number, dir: -1 | 1) {
    const a = sorted[index];
    const b = sorted[index + dir];
    if (!a || !b) return;
    const [sa, sb] = [a.sort_order, b.sort_order];
    await Promise.all([updateTier(a, { sort_order: sb === sa ? sa + dir : sb }), updateTier(b, { sort_order: sa })]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Precios</h1>
      <div style={{ color: 'var(--text-dim)', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0 }}>
          Los tramos valen para todas las noches. Edita el precio o la descripción y se guarda al salir del campo.
          «Activo / Oculto» quita un tramo de la venta sin borrarlo.
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: 'var(--text)' }}>Entradas por noche:</strong> el máximo de entradas de ese tramo que se
          venden cada noche (el viernes y el sábado cuentan por separado). Déjalo vacío si no quieres poner límite.
          Además cada noche tiene un <strong style={{ color: 'var(--text)' }}>aforo total</strong> del local, que se cambia en
          «Eventos». La web no enseña números: avisa con «Quedan pocas» cuando a esa noche le quedan {LOW_STOCK} plazas o menos
          y con «Agotado» cuando llega a 0.
        </p>
      </div>

      {notice && (
        <div role="status" className="card" style={{ maxWidth: 900, padding: '12px 16px', fontSize: 14, borderColor: /no se pudo|no es válido|escribe|sin conexión|ya tiene/i.test(notice) ? 'rgba(255,190,60,0.6)' : 'rgba(46,204,113,0.5)' }}>
          {notice}
        </div>
      )}

      <details className="card" style={{ maxWidth: 900 }} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>+ Añadir un tramo nuevo</summary>
        <form onSubmit={addTier} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            <div>
              <label className="label" htmlFor="nt-label">Nombre del tramo</label>
              <input id="nt-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ej. VIP, Tramo 3…" maxLength={40} required />
            </div>
            <div>
              <label className="label" htmlFor="nt-desc">Descripción (opcional)</label>
              <input id="nt-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej. Entrada + copa" maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="nt-price">Precio (€)</label>
              <input id="nt-price" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="10" required />
            </div>
            <div>
              <label className="label" htmlFor="nt-kind">Cómo se vende</label>
              <select id="nt-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="online">Online (con pago en la web)</option>
                <option value="door">Solo taquilla (pago en puerta)</option>
              </select>
            </div>
            {form.kind !== 'door' && (
              <div>
                <label className="label" htmlFor="nt-stock">Entradas por noche</label>
                <input id="nt-stock" type="number" inputMode="numeric" min={0} step={1} value={form.night_limit} onChange={(e) => setForm({ ...form, night_limit: e.target.value })} placeholder="Sin límite" />
              </div>
            )}
          </div>
          <div className="center-row">
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear tramo'}</button>
          </div>
        </form>
      </details>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900 }}>
        {sorted.map((tier, index) => {
          return (
            <div key={tier.id} className="card pricing-row">
              <div className="span-2">
                <label className="label">Etiqueta</label>
                <input
                  defaultValue={tier.label}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== tier.label && updateTier(tier, { label: e.target.value.trim() })}
                />
              </div>
              <div className="span-2">
                <label className="label">Descripción</label>
                <input
                  defaultValue={tier.description || ''}
                  onBlur={(e) => updateTier(tier, { description: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Precio (€)</label>
                <input
                  inputMode="decimal"
                  defaultValue={(tier.price_cents / 100).toFixed(2)}
                  onBlur={(e) => {
                    const v = euros(e.target.value);
                    if (Number.isFinite(v) && v > 0) updateTier(tier, { price_cents: Math.round(v * 100) });
                    else e.target.value = (tier.price_cents / 100).toFixed(2);
                  }}
                />
              </div>
              <div>
                {tier.kind === 'door' ? (
                  <>
                    <label className="label">Entradas por noche</label>
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '13px 0' }}>Sin límite</div>
                  </>
                ) : (
                  <>
                    <label className="label">Entradas por noche</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="Sin límite"
                      defaultValue={tier.night_limit ?? ''}
                      onBlur={(e) => saveLimit(tier, e.target.value)}
                    />
                  </>
                )}
              </div>
              {tier.kind !== 'door' && (stats[tier.id] || []).length > 0 && (
                <div className="span-all" style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  Llevan {(stats[tier.id] || []).map((x, i) => (
                    <span key={i}>
                      {i > 0 ? ' · ' : ''}
                      <strong style={{ color: 'var(--text)' }}>{x.n}{tier.night_limit != null ? ` de ${tier.night_limit}` : ''}</strong> {x.label}
                    </span>
                  ))}
                </div>
              )}
              <button
                className={(tier.is_active ? 'btn-outline btn-sm' : 'btn-outline btn-sm btn-danger') + ' span-2'}
                onClick={() => updateTier(tier, { is_active: !tier.is_active })}
              >
                {tier.is_active ? 'Activo' : 'Oculto'}
              </button>
              <div className="span-all actions" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div className="actions">
                  <button className="btn-outline btn-sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Subir ${tier.label}`}>↑ Subir</button>
                  <button className="btn-outline btn-sm" disabled={index === sorted.length - 1} onClick={() => move(index, 1)} aria-label={`Bajar ${tier.label}`}>↓ Bajar</button>
                </div>
                <button className="btn-outline btn-sm btn-danger" onClick={() => deleteTier(tier)}>Borrar tramo</button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No hay tramos. Añade el primero arriba.</p>}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { LOW_STOCK, availability } from '@/lib/stock';

type Tier = {
  id: string;
  label: string;
  description: string | null;
  price_cents: number;
  kind: string;
  is_active: boolean;
  sort_order: number;
  stock?: number | null;
};

export default function PricingClient({ initialTiers }: { initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState(initialTiers);

  async function updateTier(tier: Tier, changes: Partial<Tier>) {
    const updated = { ...tier, ...changes };
    setTiers((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
    // El stock baja solo con cada venta: solo se envía si se ha cambiado a propósito, para no
    // pisar con un valor antiguo el que haya ahora mismo en la base de datos.
    const { stock: _stock, ...withoutStock } = updated;
    await fetch(`/api/admin/pricing/${tier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('stock' in changes ? updated : withoutStock)
    });
  }

  function saveStock(tier: Tier, raw: string) {
    const value = raw.trim();
    const next = value === '' ? null : Math.max(0, Math.floor(Number(value)));
    if (next !== null && !Number.isFinite(next)) return;
    if (next === (tier.stock ?? null)) return;
    updateTier(tier, { stock: next });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Precios</h1>
      <div style={{ color: 'var(--text-dim)', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0 }}>
          Edita el precio o la descripción y se guarda al salir del campo. Desactiva un tramo (por
          ejemplo cuando se agote) sin necesidad de borrarlo.
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: 'var(--text)' }}>Disponibles:</strong> escribe cuántas entradas quedan de
          ese tramo; baja sola con cada venta. Déjalo vacío si no quieres poner límite. La web no
          enseña el número: avisa con «Quedan pocas» cuando quedan {LOW_STOCK} o menos y con
          «Agotado» cuando llega a 0.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900 }}>
        {tiers.map((tier) => {
          const state = availability(tier);
          return (
            <div key={tier.id} className="card pricing-row">
              <div className="span-2">
                <label className="label">Etiqueta</label>
                <input
                  defaultValue={tier.label}
                  onBlur={(e) => updateTier(tier, { label: e.target.value })}
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
                  type="number"
                  step="0.5"
                  defaultValue={(tier.price_cents / 100).toFixed(2)}
                  onBlur={(e) => updateTier(tier, { price_cents: Math.round(parseFloat(e.target.value) * 100) })}
                />
              </div>
              <div>
                {tier.kind === 'door' ? (
                  <>
                    <label className="label">Disponibles</label>
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '13px 0' }}>Sin límite</div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <label className="label" style={{ margin: 0 }}>Disponibles</label>
                      {state === 'low' && <span className="badge-low badge-xs">Pocas</span>}
                      {state === 'soldout' && <span className="badge-low badge-xs badge-red">Agotado</span>}
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="Sin límite"
                      defaultValue={tier.stock ?? ''}
                      onBlur={(e) => saveStock(tier, e.target.value)}
                    />
                  </>
                )}
              </div>
              <button
                className={(tier.is_active ? 'btn-outline btn-sm' : 'btn-outline btn-sm btn-danger') + ' span-2'}
                onClick={() => updateTier(tier, { is_active: !tier.is_active })}
              >
                {tier.is_active ? 'Activo' : 'Oculto'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

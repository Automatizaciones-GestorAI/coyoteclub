'use client';
import { useState } from 'react';

type Tier = {
  id: string;
  label: string;
  description: string | null;
  price_cents: number;
  kind: string;
  is_active: boolean;
  sort_order: number;
};

export default function PricingClient({ initialTiers }: { initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState(initialTiers);

  async function updateTier(tier: Tier, changes: Partial<Tier>) {
    const updated = { ...tier, ...changes };
    setTiers((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
    await fetch(`/api/admin/pricing/${tier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Precios</h1>
      <p style={{ color: 'var(--text-dim)', maxWidth: 500 }}>
        Edita el precio o la descripción y se guarda al salir del campo. Desactiva un tramo (por
        ejemplo cuando se agote) sin necesidad de borrarlo.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
        {tiers.map((tier) => (
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
            <button
              className={tier.is_active ? 'btn-outline btn-sm' : 'btn-outline btn-sm btn-danger'}
              onClick={() => updateTier(tier, { is_active: !tier.is_active })}
            >
              {tier.is_active ? 'Activo' : 'Oculto'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

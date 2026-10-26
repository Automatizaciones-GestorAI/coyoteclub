'use client';
import { useState } from 'react';

export type SalesDay = { key: string; short: string; label: string; count: number; cents: number };

const eur = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);

// Escala "redonda" para el eje: 1, 2, 5, 10, 20, 50...
function niceMax(v: number): number {
  if (v <= 1) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) if (v <= m * pow) return m * pow;
  return 10 * pow;
}

// Columnas de entradas vendidas por día. Una sola serie: sin leyenda (el título dice qué es).
// Columnas finas (máx. 24 px, 4 px redondeados arriba), rejilla de línea fina, solo se etiqueta el máximo;
// cada día tiene su tooltip (también con el teclado) y hay una vista en tabla con todos los datos.
export default function SalesChart({ days }: { days: SalesDay[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...days.map((d) => d.count)));
  const peak = days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0);
  const step = Math.max(1, Math.ceil(days.length / 7));
  const ticks = [max, max / 2, 0].filter((t, i, a) => Number.isInteger(t) && a.indexOf(t) === i);
  const tip = active !== null ? days[active] : null;
  const pct = active !== null ? ((active + 0.5) / days.length) * 100 : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, paddingTop: 22 }}>
        <div aria-hidden="true" style={{ width: 28, height: 180, position: 'relative', flexShrink: 0 }}>
          {ticks.map((t) => (
            <span key={t} style={{ position: 'absolute', right: 0, bottom: `${(t / max) * 100}%`, transform: 'translateY(50%)', fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
              {t}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            role="img"
            aria-label={`Entradas vendidas por día. Máximo ${days[peak].count} el ${days[peak].label}.`}
            style={{ position: 'relative', height: 180 }}
          >
            {ticks.map((t) => (
              <div key={t} aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: `${(t / max) * 100}%`, borderTop: '1px solid var(--line)' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>
              {days.map((d, i) => (
                <div
                  key={d.key}
                  tabIndex={0}
                  aria-label={`${d.label}: ${d.count} ${d.count === 1 ? 'entrada' : 'entradas'}, ${eur(d.cents)}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  style={{ flex: '1 1 0', minWidth: 0, height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', outline: 'none' }}
                >
                  {/* La altura de la columna es SIEMPRE proporcional a su valor; la etiqueta del máximo va encima */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      width: 'min(24px, 70%)',
                      height: `${(d.count / max) * 100}%`,
                      minHeight: d.count > 0 ? 2 : 0,
                      background: 'var(--accent)',
                      borderRadius: '4px 4px 0 0',
                      opacity: active === null || active === i ? 1 : 0.55,
                      transition: 'opacity 0.12s ease'
                    }}
                  />
                  {i === peak && d.count > 0 && (
                    <span style={{ position: 'absolute', bottom: `calc(${(d.count / max) * 100}% + 4px)`, fontSize: 12, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{d.count}</span>
                  )}
                </div>
              ))}
            </div>
            {tip && (
              <div
                role="status"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: `${pct}%`,
                  transform: pct < 18 ? 'translateX(-10%)' : pct > 82 ? 'translateX(-90%)' : 'translateX(-50%)',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 5,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.45)'
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--accent)', borderRadius: 2 }} />
                  {tip.count} {tip.count === 1 ? 'entrada' : 'entradas'} · {eur(tip.cents)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{tip.label}</div>
              </div>
            )}
          </div>
          <div aria-hidden="true" style={{ display: 'flex', marginTop: 6 }}>
            {days.map((d, i) => (
              <div key={d.key} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', visibility: i % step === 0 || i === days.length - 1 ? 'visible' : 'hidden', overflow: 'visible' }}>
                {d.short}
              </div>
            ))}
          </div>
        </div>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-dim)' }}>Ver como tabla</summary>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Día</th>
                <th className="num">Entradas</th>
                <th className="num">Importe</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="num">{d.count}</td>
                  <td className="num">{eur(d.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

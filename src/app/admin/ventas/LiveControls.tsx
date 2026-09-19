'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type NightOption = { id: string; label: string };

// Fila de filtros (encima de todo lo que filtra) + actualización automática cada 30 s mientras
// la pestaña esté visible, para tener las cifras al día en la puerta sin recargar a mano.
export default function LiveControls({ nights, selected }: { nights: NightOption[]; selected: string }) {
  const router = useRouter();
  const [updated, setUpdated] = useState<string>('');

  const stamp = () => setUpdated(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  const refresh = () => {
    router.refresh();
    stamp();
  };

  useEffect(() => {
    stamp();
    const id = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
      <div style={{ flex: '1 1 260px', maxWidth: 420 }}>
        <label className="label" htmlFor="night">Noche</label>
        <select id="night" value={selected} onChange={(e) => router.push(`/admin/ventas?event=${encodeURIComponent(e.target.value)}`)}>
          {nights.map((n) => (
            <option key={n.id} value={n.id}>{n.label}</option>
          ))}
          <option value="all">Todas las noches</option>
        </select>
      </div>
      <button className="btn-outline btn-sm" style={{ minHeight: 44 }} onClick={refresh}>Actualizar</button>
      {updated && <span style={{ fontSize: 12, color: 'var(--text-dim)', paddingBottom: 14 }}>Actualizado a las {updated} · se refresca solo</span>}
    </div>
  );
}

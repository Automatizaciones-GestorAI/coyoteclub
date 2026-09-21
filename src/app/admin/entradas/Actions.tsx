'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function call(id: string, action: string, note?: string): Promise<{ ok: boolean; result?: string }> {
  try {
    const res = await fetch('/api/admin/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, note }) });
    const json = await res.json();
    return { ok: res.ok, result: json.result };
  } catch {
    return { ok: false };
  }
}

const MESSAGES: Record<string, string> = {
  marked_paid: 'Hecho: entrada dada por pagada.', marked_paid_oversold: 'Hecho, pero esa noche o ese tramo ya estaba completo: se han dado entradas de más. Revisa el aforo en «Ventas».',
  cancelled: 'Entrada anulada.', already: 'Ya estaba así.', used: 'Marcada como usada.', not_valid: 'No estaba válida.',
  let_in: 'Entrada dada a mano (queda por revisar).', let_in_oversold: 'Entrada dada a mano; esa noche o ese tramo ya estaba completo.',
  already_used: 'Ya había entrado con esta entrada.', not_allowed: 'Esta entrada está anulada o devuelta: no se puede dar entrada.', reviewed: 'Marcado como revisado.', not_found: 'No se encontró.'
};

function useAction() {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(id: string, action: string, confirmText?: string, note?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    const r = await call(id, action, note);
    setBusy(false);
    setMsg(r.ok ? MESSAGES[r.result ?? ''] || 'Hecho.' : 'No se pudo completar. Inténtalo de nuevo.');
    if (r.ok) router.refresh();
  }
  return { msg, busy, run };
}

export function TicketActions({ id, role, status, cancelReason, viewUrl, waUrl, amount }: { id: string; role: 'admin' | 'door'; status: string; cancelReason: string | null; viewUrl: string; waUrl: string; amount: string }) {
  const { msg, busy, run } = useAction();
  const [copied, setCopied] = useState(false);
  const isAdmin = role === 'admin';
  const canPay = isAdmin && (status === 'pending' || (status === 'cancelled' && cancelReason !== 'refunded' && cancelReason !== 'manual'));
  // Dar entrada a mano: solo entradas válidas, pendientes o caducadas sin pago; nunca devueltas, anuladas o rechazadas
  const canLetIn = status === 'pending' || status === 'valid' || (status === 'cancelled' && (!cancelReason || cancelReason === 'expired'));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="actions" style={{ justifyContent: 'flex-start' }}>
        {(status === 'valid' || status === 'used') && (
          <>
            <a className="btn-outline btn-sm" href={viewUrl} target="_blank" rel="noopener">Ver entrada</a>
            <a className="btn btn-sm" href={waUrl} target="_blank" rel="noopener">Enviar por WhatsApp</a>
            <button className="btn-outline btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(viewUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copia el enlace:', viewUrl); } }}>{copied ? '¡Copiado!' : 'Copiar enlace'}</button>
          </>
        )}
        {status === 'valid' && (
          <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(id, 'mark_used', '¿Marcar esta entrada como usada (ha entrado)?')}>Marcar como usada</button>
        )}
        {status !== 'used' && status !== 'valid' && canPay && (
          <button className="btn btn-sm" disabled={busy} onClick={() => run(id, 'mark_paid', `¿Has comprobado en Redsys que SÍ se cobraron ${amount}? La entrada pasará a válida y el cliente podrá verla.`)}>Sí cobró: dar entrada válida</button>
        )}
        {canLetIn && (
          <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(id, 'let_in', `¿Dar entrada ahora en la puerta? Quedará anotada para revisar el cobro después.`, 'Dada a mano desde la ficha')}>Dar entrada ahora</button>
        )}
        {isAdmin && status !== 'used' && status !== 'cancelled' && (
          <details className="menu-pop">
            <summary className="btn-outline btn-sm btn-danger">Anular…</summary>
            <div className="pop">
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(id, 'cancel', '¿Anular esta entrada (error o duplicada)? Ya no valdrá y la plaza vuelve al tramo.')}>Anular (error o duplicada)</button>
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(id, 'refund', `¿Marcar como DEVUELTA? Hazlo cuando ya hayas devuelto ${amount} en el panel de Redsys. La entrada dejará de valer.`)}>Anular (devuelta en Redsys)</button>
            </div>
          </details>
        )}
      </div>
      {msg && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{msg}</div>}
    </div>
  );
}

export function ReviewActions({ kind, id, amount, waUrl }: { kind: 'expired' | 'manual' | 'event'; id: string; amount?: string; waUrl?: string }) {
  const { msg, busy, run } = useAction();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="actions" style={{ justifyContent: 'flex-start' }}>
        {kind === 'expired' && (
          <>
            <button className="btn btn-sm" disabled={busy} onClick={() => run(id, 'mark_paid', `¿Has comprobado en Redsys que SÍ se cobraron ${amount}? La entrada pasará a válida.`)}>Sí cobró: dar entrada</button>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(id, 'reviewed')}>No cobró: dejar anulada</button>
            {waUrl && <a className="btn-outline btn-sm" href={waUrl} target="_blank" rel="noopener">WhatsApp al cliente</a>}
          </>
        )}
        {kind === 'manual' && (
          <button className="btn btn-sm" disabled={busy} onClick={() => run(id, 'reviewed')}>Comprobado: está cobrado</button>
        )}
        {kind === 'event' && (
          <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(id, 'event_reviewed')}>Ya revisado</button>
        )}
      </div>
      {msg && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{msg}</div>}
    </div>
  );
}

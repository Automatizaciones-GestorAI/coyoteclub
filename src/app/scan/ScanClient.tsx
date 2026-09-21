'use client';
import { useEffect, useRef, useState } from 'react';

type Bank = { ds_response: string | null; amount_cents: number | null; outcome: string; created_at: string };
type Ticket = {
  id: string; buyer_name: string | null; buyer_phone: string | null; status: string; cancel_reason: string | null;
  order_id: string | null; amount_cents: number | null; created_at: string; paid_at: string | null; used_at: string | null;
  tier: string | null; event: string | null;
};
type Result = { valid: boolean; reason?: string; ticket?: Ticket; bank?: Bank[]; letIn?: boolean; error?: string };

const eur = (c: number | null) => (c === null ? '' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c / 100));
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });
const dayhm = (iso: string) => new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const BANK_TEXT: Record<string, string> = {
  confirmed: 'pago confirmado', already: 'aviso repetido', cancelled: 'pago rechazado', reactivated: 'pago tardío confirmado',
  amount_mismatch: 'importe distinto', not_found: 'pedido desconocido', ignored: 'ignorado', error: 'error',
  expired: 'sesión de pago caducada, sin cobro', payment_failed: 'pago cancelado o rechazado, sin cobro', refunded: 'devuelto', pending_async: 'pago en proceso'
};
// Respuestas de la comprobación en Stripe (acción check_payment)
const STRIPE_NOTE: Record<string, string> = {
  stripe_open: 'Stripe dice que NO ha pagado todavía (su página de pago sigue abierta). No le dejes pasar hasta que pague.',
  stripe_expired: 'Stripe dice que NO hubo cobro (la sesión de pago caducó o la canceló). No le dejes pasar.',
  stripe_no_session: 'Esta compra no llegó a abrir la página de pago: no hay cobro que comprobar.',
  stripe_mismatch: 'Stripe cobró un importe distinto del esperado: no se ha activado. Que lo revise el club.',
  stripe_error: 'No se ha podido consultar Stripe ahora mismo. Inténtalo otra vez o usa el otro método.',
  not_allowed: 'Esta entrada está anulada o devuelta: no le dejes pasar.'
};

export default function ScanClient({ canPanel = true }: { canPanel?: boolean }) {
  const scannerRef = useRef<any>(null);
  const busyRef = useRef(false); // evita procesar el mismo QR una y otra vez mientras sigue delante de la cámara
  const codeRef = useRef(''); // último QR leído (para volver a validarlo tras comprobar el pago)
  const [note, setNote] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let html5QrCode: any;
    let cancelled = false;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          async (decodedText: string) => {
            if (busyRef.current) return;
            busyRef.current = true;
            codeRef.current = decodedText;
            setNote('');
            try { html5QrCode.pause(true); } catch { /* la cámara ya estaba parada */ }
            try {
              const res = await fetch('/api/tickets/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_code: decodedText })
              });
              if (res.status === 401) setResult({ valid: false, reason: 'La sesión ha caducado: vuelve a entrar al panel', error: 'auth' });
              else setResult(await res.json());
            } catch {
              setResult({ valid: false, reason: 'Sin conexión: comprueba internet y vuelve a escanear', error: 'network' });
            }
          },
          () => {}
        )
        .catch(() => setCameraError('No se puede usar la cámara. Permite el acceso a la cámara en el navegador (candado de la barra de direcciones) y recarga.'));
    });
    return () => {
      cancelled = true;
      html5QrCode?.stop().catch(() => {});
    };
  }, []);

  function scanNext() {
    setResult(null);
    setNote('');
    busyRef.current = false;
    try { scannerRef.current?.resume(); } catch { /* nada */ }
  }

  // Pregunta a Stripe si esa compra está cobrada. Si lo está, la entrada pasa a válida y se vuelve a validar el QR (entra a la primera).
  async function checkStripe() {
    const t = result?.ticket;
    if (!t) return;
    setWorking(true);
    setNote('');
    try {
      const res = await fetch('/api/admin/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, action: 'check_payment' }) });
      const json = await res.json();
      if (res.ok && (json.result === 'stripe_confirmed' || json.result === 'already')) {
        const again = await fetch('/api/tickets/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qr_code: codeRef.current }) });
        setResult(await again.json());
      } else if (res.ok) setNote(STRIPE_NOTE[json.result] || 'No se ha podido comprobar el pago.');
      else setNote('No se ha podido comprobar el pago. Inténtalo otra vez.');
    } catch {
      setNote('Sin conexión. Vuelve a intentarlo.');
    }
    setWorking(false);
  }

  async function letIn() {
    const t = result?.ticket;
    if (!t) return;
    const ok = window.confirm(`¿Has visto en el móvil del cliente el cargo de ${eur(t.amount_cents)} a COYOTE CLUB?\n\nSe le dará entrada y quedará anotado para que el club lo compruebe en Stripe después.`);
    if (!ok) return;
    setWorking(true);
    try {
      const res = await fetch('/api/admin/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, action: 'let_in', note: 'Dada en la puerta tras ver el cargo en el móvil del cliente' }) });
      const json = await res.json();
      if (res.ok && (json.result === 'let_in' || json.result === 'let_in_oversold' || json.result === 'used')) setResult({ valid: true, letIn: true, ticket: t });
      else if (json.result === 'not_allowed') setResult({ valid: false, reason: 'Esta entrada está anulada o devuelta: no le dejes pasar', ticket: t });
      else if (json.result === 'already_used') setResult({ valid: false, reason: 'Ya se usó esta entrada: no le dejes pasar', ticket: { ...t, status: 'used' } });
      else window.alert('No se ha podido dar entrada. Vuelve a intentarlo.');
    } catch {
      window.alert('Sin conexión. Vuelve a intentarlo.');
    }
    setWorking(false);
  }

  const t = result?.ticket;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 40px', gap: 16, background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.14), transparent 55%), var(--bg)' }}>
      <div style={{ width: 'min(360px, 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        {canPanel ? <a href="/admin/ventas" className="btn-outline btn-sm">← Panel</a> : <a href="/admin/cuenta" className="btn-outline btn-sm">Mi cuenta</a>}
        <a href="/admin/entradas" className="btn-outline btn-sm">Buscar por nombre</a>
      </div>
      <div className="display" style={{ fontSize: 28 }}>ESCANEAR ENTRADA</div>
      {cameraError && <div className="card" style={{ width: 'min(360px, 100%)', color: '#ffbe3c', fontSize: 14 }}>{cameraError}</div>}
      <div id="qr-reader" style={{ width: 'min(360px, 100%)', borderRadius: 16, overflow: 'hidden' }} />

      {result && (
        <div
          className="card"
          style={{
            width: 'min(360px, 100%)',
            borderColor: result.valid ? '#2ecc71' : '#ff4d4d',
            background: result.valid ? 'rgba(46,204,113,0.1)' : 'rgba(255,77,77,0.1)',
            display: 'flex', flexDirection: 'column', gap: 12
          }}
        >
          <div className="display" style={{ fontSize: 28, textAlign: 'center', color: result.valid ? '#2ecc71' : '#ff4d4d', lineHeight: 1.05 }}>
            {result.valid ? (result.letIn ? '✔ ENTRA (A MANO)' : '✔ VÁLIDA') : '✕ NO VÁLIDA'}
          </div>
          {!result.valid && <div style={{ textAlign: 'center', fontWeight: 700 }}>{result.reason}</div>}

          {t && (
            <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Nombre</span><b>{t.buyer_name || '—'}</b>
              {t.buyer_phone && (<><span style={{ color: 'var(--text-dim)' }}>Teléfono</span><a href={`tel:${t.buyer_phone}`} style={{ color: 'var(--accent)', fontWeight: 700 }}>{t.buyer_phone}</a></>)}
              <span style={{ color: 'var(--text-dim)' }}>Entrada</span><span>{[t.tier, t.event].filter(Boolean).join(' · ')}</span>
              {!result.valid && (<>
                <span style={{ color: 'var(--text-dim)' }}>Importe</span><span>{eur(t.amount_cents)}</span>
                <span style={{ color: 'var(--text-dim)' }}>Pedido</span><span style={{ fontFamily: 'monospace' }}>{t.order_id || '—'}</span>
                <span style={{ color: 'var(--text-dim)' }}>Iniciada</span><span>{dayhm(t.created_at)}</span>
                {t.used_at && (<><span style={{ color: 'var(--text-dim)' }}>Usada</span><b>hoy a las {hhmm(t.used_at)}</b></>)}
                <span style={{ color: 'var(--text-dim)' }}>Avisos de Stripe</span>
                <span>
                  {result.bank && result.bank.length > 0
                    ? result.bank.map((b, i) => (<span key={i} style={{ display: 'block' }}>{b.ds_response === null ? '' : `${b.ds_response} · `}{BANK_TEXT[b.outcome] || b.outcome} · {eur(b.amount_cents)} · {dayhm(b.created_at)}</span>))
                    : 'ninguno recibido'}
                </span>
              </>)}
            </div>
          )}

          {!result.valid && t && (t.status === 'pending' || (t.status === 'cancelled' && (!t.cancel_reason || t.cancel_reason === 'expired'))) && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                ¿Dice que ha pagado? Pulsa el botón: se le pregunta a Stripe y, si está cobrado, entra al momento.
              </div>
              <button className="btn" onClick={checkStripe} disabled={working}>{working ? 'Un momento…' : 'Comprobar el pago en Stripe'}</button>
              {note && <div role="alert" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: '#ffbe3c' }}>{note}</div>}
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Si no se puede comprobar, pídele que te enseñe en su app del banco el cargo de <b style={{ color: 'var(--text)' }}>{eur(t.amount_cents)}</b> a <b style={{ color: 'var(--text)' }}>COYOTE CLUB</b> de estos días.
              </div>
              <button className="btn-outline" onClick={letIn} disabled={working}>Le he visto el cargo → dar entrada</button>
            </div>
          )}
          {!result.valid && t?.status === 'used' && (
            <div style={{ fontSize: 12, color: '#ff9b9b', textAlign: 'center' }}>No le dejes pasar con esta entrada: ya entró alguien con ella.</div>
          )}
          {!result.valid && !t && result.error !== 'network' && result.error !== 'auth' && (
            <a href="/admin/entradas" className="btn-outline btn-sm">Buscar por nombre o teléfono</a>
          )}
          {!result.valid && t?.order_id && (
            <a href={`/admin/entradas?q=${encodeURIComponent(t.order_id)}`} className="btn-outline btn-sm">Ver ficha completa</a>
          )}
          <button className={result.valid ? 'btn' : 'btn-outline'} onClick={scanNext}>Siguiente</button>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';

export default function CuentaClient() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== again) return setMsg({ ok: false, text: 'La contraseña nueva y su repetición no coinciden.' });
    setBusy(true);
    try {
      const res = await fetch('/api/admin/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current, next }) });
      const json = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: 'Contraseña cambiada. Las demás sesiones abiertas con tu usuario se han cerrado.' });
        setCurrent(''); setNext(''); setAgain('');
      } else setMsg({ ok: false, text: json.error || 'No se pudo cambiar la contraseña.' });
    } catch {
      setMsg({ ok: false, text: 'Sin conexión. Vuelve a intentarlo.' });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 22 }}>Cambiar mi contraseña</h2>
      <div>
        <label className="label" htmlFor="cur">Contraseña actual</label>
        <input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="nw">Contraseña nueva (mínimo 10 caracteres)</label>
        <input id="nw" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={10} />
      </div>
      <div>
        <label className="label" htmlFor="ag">Repite la contraseña nueva</label>
        <input id="ag" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={10} />
      </div>
      {msg && <div role="status" style={{ fontSize: 14, color: msg.ok ? '#2ecc71' : '#ffbe3c' }}>{msg.text}</div>}
      <div className="center-row"><button className="btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button></div>
    </form>
  );
}

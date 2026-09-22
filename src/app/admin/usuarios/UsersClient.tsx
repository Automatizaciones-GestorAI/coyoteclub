'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Contraseña legible: sin letras que se confunden (0/O, 1/l/I)
function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function NewUserForm() {
  const router = useRouter();
  const empty = { username: '', display_name: '', role: 'door', password: '', manage: false };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.username, display_name: f.display_name, role: f.role, password: f.password, can_manage_users: f.manage }) });
      const json = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: `Usuario «${json.username}» creado. Su contraseña es: ${f.password} — cópiala ahora y entrégasela; no se puede volver a ver.` });
        setF(empty);
        router.refresh();
      } else setMsg({ ok: false, text: json.error || 'No se pudo crear el usuario.' });
    } catch {
      setMsg({ ok: false, text: 'Sin conexión. Vuelve a intentarlo.' });
    }
    setBusy(false);
  }

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>+ Crear un usuario</summary>
      <form onSubmit={submit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid-2">
          <div>
            <label className="label" htmlFor="nu-user">Usuario (para entrar)</label>
            <input id="nu-user" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} placeholder="marta" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
          </div>
          <div>
            <label className="label" htmlFor="nu-name">Nombre (para mostrar)</label>
            <input id="nu-name" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} placeholder="Marta López" maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="nu-role">Perfil</label>
            <select id="nu-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, manage: e.target.value === 'admin' ? f.manage : false })}>
              <option value="door">Puerta (escanea y busca entradas)</option>
              <option value="admin">Administrador (todo)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nu-pass">Contraseña (mínimo 10)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="nu-pass" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="off" required minLength={10} />
              <button type="button" className="btn-outline btn-sm" onClick={() => setF({ ...f, password: generatePassword() })}>Generar</button>
            </div>
          </div>
        </div>
        {f.role === 'admin' && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--text-dim)' }}>
            <input type="checkbox" style={{ width: 18, height: 18 }} checked={f.manage} onChange={(e) => setF({ ...f, manage: e.target.checked })} />
            Puede gestionar usuarios (solo para GestorAI)
          </label>
        )}
        {msg && <div role="status" style={{ fontSize: 14, color: msg.ok ? '#2ecc71' : '#ffbe3c', wordBreak: 'break-word' }}>{msg.text}</div>}
        <div className="center-row"><button className="btn" type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear usuario'}</button></div>
      </form>
    </details>
  );
}

export function UserActions({ id, me, role, manage, active, username }: { id: string; me: boolean; role: string; manage: boolean; active: boolean; username: string }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function patch(action: string, value: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, value }) });
      const json = await res.json();
      if (res.ok) {
        setMsg(action === 'reset_password' ? `Contraseña cambiada. Las sesiones abiertas de ${username} se han cerrado.` : 'Hecho.');
        if (action === 'reset_password') setPw('');
        router.refresh();
      } else setMsg(json.error || 'No se pudo completar el cambio.');
    } catch {
      setMsg('Sin conexión. Vuelve a intentarlo.');
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`¿Borrar a ${username} de verdad?\n\nDeja de poder entrar (como al desactivar), pero además desaparece de esta lista. Lo que haya hecho (entradas escaneadas, cobros dados por buenos...) queda igual en el historial, con su nombre. No se puede deshacer.`)) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const json = await res.json();
      if (res.ok) router.refresh();
      else setMsg(json.error || 'No se pudo borrar el usuario.');
    } catch {
      setMsg('Sin conexión. Vuelve a intentarlo.');
    }
    setBusy(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="actions" style={{ justifyContent: 'flex-start' }}>
        {!me && (
          <>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => patch('set_active', !active, active ? `¿Desactivar a ${username}? No podrá entrar y su sesión se cierra al instante.` : undefined)}>{active ? 'Desactivar' : 'Activar'}</button>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => patch('set_role', role === 'admin' ? 'door' : 'admin', `¿Pasar a ${username} al perfil ${role === 'admin' ? 'Puerta' : 'Administrador'}?`)}>Pasar a {role === 'admin' ? 'Puerta' : 'Administrador'}</button>
            {role === 'admin' && (
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => patch('set_manage', !manage, manage ? `¿Quitar a ${username} el permiso para gestionar usuarios?` : `¿Dar a ${username} permiso para gestionar usuarios?`)}>{manage ? 'Quitar gestión de usuarios' : 'Dar gestión de usuarios'}</button>
            )}
            <button className="btn-outline btn-sm btn-danger" disabled={busy} onClick={remove}>Borrar usuario</button>
          </>
        )}
      </div>
      {!me && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-dim)' }}>Cambiar su contraseña</summary>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input aria-label={`Nueva contraseña de ${username}`} style={{ flex: '1 1 200px', width: 'auto' }} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña (mínimo 10)" autoComplete="off" />
            <button className="btn-outline btn-sm" type="button" onClick={() => setPw(generatePassword())}>Generar</button>
            <button className="btn btn-sm" disabled={busy || pw.length < 10} onClick={() => patch('reset_password', pw, `¿Cambiar la contraseña de ${username}? Sus sesiones abiertas se cerrarán.`)}>Guardar</button>
          </div>
          {pw && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Cuando guardes, entrégasela: no se puede volver a ver.</div>}
        </details>
      )}
      {me && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Tu propia contraseña se cambia en «Mi cuenta».</div>}
      {msg && <div role="status" style={{ fontSize: 13, color: 'var(--text-dim)' }}>{msg}</div>}
    </div>
  );
}

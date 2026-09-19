'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    setLoading(false);
    let json: any = {};
    try { json = await res.json(); } catch { /* respuesta que no es JSON */ }
    if (res.ok) {
      router.push(json.next || '/admin');
      router.refresh();
    } else {
      setError(json.error || 'No se pudo entrar. Inténtalo de nuevo.');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background:
          'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.18), transparent 55%), var(--bg)'
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: 'min(340px, 100%)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src="/images/logo.png"
            alt="Coyote Club"
            style={{ display: 'block', width: 'min(220px, 70%)', height: 'auto', margin: '0 auto 14px' }}
          />
          <div style={{ color: 'var(--text-dim)', fontSize: 13, letterSpacing: '0.05em' }}>PANEL DE GESTIÓN</div>
        </div>
        <div>
          <label className="label" htmlFor="username">Usuario</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div style={{ color: 'var(--accent)', fontSize: 13 }}>{error}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

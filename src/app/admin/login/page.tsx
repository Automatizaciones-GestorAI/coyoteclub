'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
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
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      setError('Contraseña incorrecta');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.18), transparent 55%), var(--bg)'
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="display" style={{ fontSize: 32 }}>
            COYOTE <span style={{ color: 'var(--accent)' }}>CLUB</span>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, letterSpacing: '0.05em' }}>PANEL DE GESTIÓN</div>
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
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

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.16), transparent 55%), var(--bg)' }}>
      <div className="display" style={{ fontSize: 44 }}>
        COYOTE <span style={{ color: 'var(--accent)' }}>CLUB</span>
      </div>
      <p style={{ color: 'var(--text-dim)' }}>Este servicio aloja el panel de gestión y el sistema de entradas.</p>
      <a href="/admin" className="btn">Ir al panel /admin</a>
    </div>
  );
}

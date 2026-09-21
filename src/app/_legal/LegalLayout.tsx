import { LegalDate, LegalLinks } from './Bits';

export function LegalLayout({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 0%, rgba(255,20,156,0.12), transparent 55%), var(--bg)', padding: 'clamp(24px, 6vw, 56px) 16px 40px' }}>
      <main className="legal">
        <a href="/" aria-label="Coyote Club - Inicio" style={{ display: 'inline-block', marginBottom: 28 }}>
          <img src="/images/logo.png" alt="Coyote Club" style={{ display: 'block', width: 'min(170px, 50vw)', height: 'auto' }} />
        </a>
        <h1>{title}</h1>
        <p className="legal-updated">Última actualización: <LegalDate /></p>
        {intro && <p>{intro}</p>}
        {children}
        <div className="legal-foot">
          <LegalLinks />
          <a href="/" style={{ fontSize: 13, color: 'var(--text-dim)' }}>← Volver a la web</a>
        </div>
      </main>
    </div>
  );
}

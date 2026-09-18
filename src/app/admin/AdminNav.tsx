'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const items = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/events', label: 'Eventos' },
  { href: '/admin/pricing', label: 'Precios' },
  { href: '/admin/gallery', label: 'Galería' },
  { href: '/scan', label: 'Escanear QR' }
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/admin/login');
  }

  return (
    <nav style={{ width: 230, borderRight: '1px solid var(--line)', padding: '32px 22px', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-alt)' }}>
      <div className="display" style={{ fontSize: 24, marginBottom: 28 }}>
        COYOTE <span style={{ color: 'var(--accent)' }}>CLUB</span>
      </div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            padding: '11px 14px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            transition: 'background 0.15s ease, color 0.15s ease',
            background: pathname === item.href ? 'var(--bg-card)' : 'transparent',
            color: pathname === item.href ? 'var(--accent)' : 'var(--text-dim)'
          }}
        >
          {item.label}
        </Link>
      ))}
      <button onClick={logout} className="btn-outline" style={{ marginTop: 24 }}>
        Cerrar sesión
      </button>
    </nav>
  );
}

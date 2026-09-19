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
    <nav className="admin-nav">
      <Link href="/admin" className="admin-nav-logo" aria-label="Coyote Club - Panel">
        <img src="/images/logo.png" alt="Coyote Club" />
      </Link>
      <div className="admin-nav-links">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'admin-link active' : 'admin-link'}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <button onClick={logout} className="btn-outline admin-nav-logout">
        Cerrar sesión
      </button>
    </nav>
  );
}

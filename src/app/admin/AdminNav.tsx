'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const ADMIN_ITEMS = [
  { href: '/admin/ventas', label: 'Ventas' },
  { href: '/admin/entradas', label: 'Entradas' },
  { href: '/admin/events', label: 'Eventos' },
  { href: '/admin/pricing', label: 'Precios' },
  { href: '/admin/gallery', label: 'Galería' },
  { href: '/scan', label: 'Escanear QR' }
];
const DOOR_ITEMS = [
  { href: '/scan', label: 'Escanear QR' },
  { href: '/admin/entradas', label: 'Entradas' }
];

export default function AdminNav({ alerts = 0, role = 'admin', manager = false, name = '' }: { alerts?: number; role?: 'admin' | 'door'; manager?: boolean; name?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = [...(role === 'door' ? DOOR_ITEMS : ADMIN_ITEMS), ...(manager ? [{ href: '/admin/usuarios', label: 'Usuarios' }] : []), { href: '/admin/cuenta', label: 'Mi cuenta' }];

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/admin/login');
  }

  return (
    <nav className="admin-nav">
      <Link href={role === 'door' ? '/scan' : '/admin/ventas'} className="admin-nav-logo" aria-label="Coyote Club - Panel">
        {/* En el sidebar de escritorio hay sitio de sobra: se ve el zorro encima del nombre. En la barra estrecha
            del móvil se queda solo el nombre (como antes), para no hacer esa barra más alta de lo necesario. */}
        <img className="logo-full" src="/images/logo-admin.webp" alt="Coyote Club" />
        <img className="logo-compact" src="/images/logo.webp" alt="Coyote Club" />
      </Link>
      <div className="admin-nav-links">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'admin-link active' : 'admin-link'}
          >
            {item.label}
            {item.href === '/admin/entradas' && alerts > 0 && (
              <span className="nav-alert" aria-label={`${alerts} por revisar`}>{alerts}</span>
            )}
          </Link>
        ))}
        {name && <div className="admin-nav-user">{name} · {role === 'door' ? 'Puerta' : 'Administrador'}</div>}
      </div>
      <button onClick={logout} className="btn-outline admin-nav-logout">
        Cerrar sesión
      </button>
    </nav>
  );
}

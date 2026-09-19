import AdminShell, { requireStaff } from '../AdminShell';
import CuentaClient from './CuentaClient';

export const dynamic = 'force-dynamic';

export default async function CuentaPage() {
  const s = await requireStaff();
  return (
    <AdminShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Mi cuenta</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 14 }}>
            Sesión iniciada como <b style={{ color: 'var(--text)' }}>{s.displayName || s.username}</b> ({s.username}) · perfil {s.role === 'door' ? 'Puerta' : 'Administrador'}.
          </p>
        </div>
        <CuentaClient />
      </div>
    </AdminShell>
  );
}

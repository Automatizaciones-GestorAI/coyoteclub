import { supabaseAdmin } from '@/lib/supabase';
import AdminShell, { requireManager } from '../AdminShell';
import { NewUserForm, UserActions } from './UsersClient';

export const dynamic = 'force-dynamic';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'nunca');

export default async function UsersPage() {
  const me = await requireManager();
  const { data } = await supabaseAdmin.from('admin_users').select('id, username, display_name, role, can_manage_users, is_active, last_login_at, created_at').order('created_at');
  const users = data ?? [];
  return (
    <AdminShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Usuarios</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 14, maxWidth: 620 }}>
            Cada persona entra con su usuario y contraseña. <b style={{ color: 'var(--text)' }}>Administrador</b> ve y cambia todo; <b style={{ color: 'var(--text)' }}>Puerta</b> solo escanea y busca entradas.
            Cada acción a mano queda anotada con quién la hizo.
          </p>
        </div>
        <NewUserForm />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users.map((u: any) => (
            <div key={u.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, opacity: u.is_active ? 1 : 0.65 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{u.display_name || u.username}{u.id === me.id && <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 13 }}> (tú)</span>}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>usuario: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{u.username}</span> · último acceso: {when(u.last_login_at)}</div>
                </div>
                <div className="actions">
                  <span className="chip chip-dim">{u.role === 'door' ? 'Puerta' : 'Administrador'}</span>
                  {u.can_manage_users && <span className="chip chip-ok">Gestiona usuarios</span>}
                  {!u.is_active && <span className="chip chip-off">Desactivado</span>}
                </div>
              </div>
              <UserActions id={u.id} me={u.id === me.id} role={u.role} manage={u.can_manage_users} active={u.is_active} username={u.username} />
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

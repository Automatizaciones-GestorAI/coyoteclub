import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminShell from './AdminShell';

// El menú lateral vive aquí y no dentro de cada página: al cambiar de pestaña del panel se queda quieto
// y solo cambia lo de la derecha (con loading.tsx se ve el esqueleto al instante). /admin/login queda
// fuera de este grupo, por eso aquí sí se puede exigir sesión sin que haya bucle de redirecciones.
// Cada página sigue comprobando su permiso con require...(): el layout no se vuelve a ejecutar al
// navegar entre pestañas, así que no sustituye esa comprobación.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  return <AdminShell session={session}>{children}</AdminShell>;
}

// Sin comprobación de sesión aquí: /admin/login también cuelga de esta carpeta y
// redirigirse a sí mismo daba un bucle. Ver AdminShell.tsx (requireAdmin).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

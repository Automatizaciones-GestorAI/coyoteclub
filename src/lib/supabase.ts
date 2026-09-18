import { createClient } from '@supabase/supabase-js';

// Valores de respaldo SOLO para que "next build" no falle si las variables de
// entorno reales aún no están puestas en ese momento (p.ej. en el build de
// EasyPanel). En producción, el contenedor arranca en un proceso nuevo que sí
// lee las variables de entorno reales, así que esto no afecta al funcionamiento.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

// Cliente para el navegador / lecturas públicas (usa la anon key, respeta RLS)
export const supabase = createClient(supabaseUrl, anonKey);

// Cliente con permisos de administrador (SOLO se usa en el servidor: rutas /api y Server Actions).
// Nunca importar este archivo desde un componente de cliente ("use client").
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

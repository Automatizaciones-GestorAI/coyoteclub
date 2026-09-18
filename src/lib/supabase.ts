import { createClient } from '@supabase/supabase-js';

// Cliente para el navegador / lecturas públicas (usa la anon key, respeta RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cliente con permisos de administrador (SOLO se usa en el servidor: rutas /api y Server Actions).
// Nunca importar este archivo desde un componente de cliente ("use client").
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

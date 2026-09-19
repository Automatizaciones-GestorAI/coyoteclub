-- Seguridad de la base de datos (cliente real).
-- La web solo habla con Supabase desde el servidor con la clave secreta (service_role),
-- que ignora la seguridad por filas. Con RLS activo y SIN políticas, la clave pública (anon)
-- ya no puede leer ni modificar nada: nombres y teléfonos de compradores incluidos.

alter table public.events enable row level security;
alter table public.price_tiers enable row level security;
alter table public.gallery_images enable row level security;
alter table public.tickets enable row level security;

-- Doble cerrojo: además se quitan los permisos de tabla a los roles públicos.
revoke all on public.events, public.price_tiers, public.gallery_images, public.tickets from anon, authenticated;

-- Las imágenes se suben desde el servidor: el bucket solo admite imágenes de hasta 5 MB.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'media';

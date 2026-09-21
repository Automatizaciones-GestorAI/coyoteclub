-- Prueba de aceptación de las condiciones de compra y la política de privacidad en cada compra.
-- Columnas nuevas y opcionales: las entradas anteriores quedan con null y el código antiguo sigue funcionando.
alter table public.tickets add column if not exists terms_accepted_at timestamptz;
alter table public.tickets add column if not exists terms_version text;

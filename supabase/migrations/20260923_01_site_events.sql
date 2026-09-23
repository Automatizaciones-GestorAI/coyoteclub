-- Seguimiento propio de la web (sin cookies, sin nada que identifique a nadie): solo cuenta visitas a las
-- páginas y clics en botones clave (Entradas, WhatsApp, mapa...), para que el panel de Admin pueda enseñar
-- "cuánta gente entra e interactúa" sin depender de Google Analytics ni de un aviso de cookies (la web dice
-- en /cookies que no usa cookies de analítica: esto lo sigue cumpliendo, no se guarda IP ni ningún identificador).

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('pageview', 'click')),
  path text,   -- para "pageview": la página (/, /entradas...)
  label text,  -- para "click": qué se pulsó (whatsapp_nav, hero_entradas, mapa...)
  created_at timestamptz not null default now()
);

create index if not exists idx_site_events_created on public.site_events (created_at);
create index if not exists idx_site_events_kind_created on public.site_events (kind, created_at);

-- Solo el servidor (service_role) puede leer o escribir: se guarda desde /api/track, nunca directo desde el navegador.
alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;

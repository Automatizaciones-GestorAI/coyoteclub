-- Aforo por tramo de precio.
-- stock = entradas que quedan a la venta online de ese tramo; NULL = sin límite.
-- Baja sola con cada compra (reserve_ticket_stock) y el club la edita desde /admin/pricing.

alter table public.price_tiers
  add column if not exists stock integer check (stock is null or stock >= 0);

-- Descuenta una entrada en una única instrucción atómica: true si había (o no hay límite),
-- false si está agotado o el tramo no existe. Sin lecturas previas, no hay carreras.
create or replace function public.reserve_ticket_stock(p_tier uuid)
returns boolean
language plpgsql
as $$
begin
  update public.price_tiers
     set stock = case when stock is null then null else stock - 1 end
   where id = p_tier
     and (stock is null or stock > 0);
  return found;
end;
$$;

-- Devuelve una entrada (solo si el tramo tiene límite).
create or replace function public.release_ticket_stock(p_tier uuid)
returns void
language sql
as $$
  update public.price_tiers set stock = stock + 1 where id = p_tier and stock is not null;
$$;

-- Solo el servidor (service_role) puede llamarlas: por defecto Supabase las dejaría
-- ejecutables con la clave pública (anon).
revoke all on function public.reserve_ticket_stock(uuid) from public, anon, authenticated;
revoke all on function public.release_ticket_stock(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ticket_stock(uuid) to service_role;
grant execute on function public.release_ticket_stock(uuid) to service_role;

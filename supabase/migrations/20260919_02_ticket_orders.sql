-- Preparación para cobrar con Redsys.
-- Una entrada nace "pending" al iniciar el pago y solo pasa a "valid" cuando Redsys
-- confirma el cobro (POST /api/checkout/redsys/notify). Nada de esto cambia lo que ya hay.

alter table public.tickets
  add column if not exists order_id text,          -- nº de pedido enviado a Redsys (12 caracteres)
  add column if not exists amount_cents integer,   -- lo que se cobra (foto del precio al comprar)
  add column if not exists paid_at timestamptz;    -- cuándo confirmó el banco el cobro

alter table public.tickets drop constraint if exists tickets_amount_check;
alter table public.tickets add constraint tickets_amount_check check (amount_cents is null or amount_cents >= 0);

alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status = any (array['pending'::text, 'valid'::text, 'used'::text, 'cancelled'::text]));

create unique index if not exists tickets_order_id_key on public.tickets (order_id) where order_id is not null;
create index if not exists idx_tickets_event_status on public.tickets (event_id, status);
create index if not exists idx_tickets_pending_created on public.tickets (created_at) where status = 'pending';

-- Anula las entradas que llevan demasiado rato sin pagarse y devuelve su plaza al tramo.
create or replace function public.expire_pending_tickets(p_minutes integer default 30)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.tickets
       set status = 'cancelled'
     where status = 'pending'
       and created_at < now() - make_interval(mins => p_minutes)
    returning tier_id
  ), per_tier as (
    select tier_id, count(*)::integer as n from expired where tier_id is not null group by tier_id
  ), restock as (
    update public.price_tiers t
       set stock = t.stock + p.n
      from per_tier p
     where t.id = p.tier_id and t.stock is not null
    returning t.id
  )
  select (select count(*) from expired)::integer into v_count;
  return v_count;
end;
$$;

-- Redsys confirma un cobro. Devuelve: not_found | amount_mismatch | already | confirmed | reactivated
-- (reactivated = el pago llegó tarde, cuando la reserva ya había caducado: se respeta el cobro).
create or replace function public.confirm_ticket_payment(p_order text, p_amount integer)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.tickets%rowtype;
  v_had_stock boolean;
begin
  select * into v from public.tickets where order_id = p_order for update;
  if not found then return 'not_found'; end if;
  if v.amount_cents is not null and v.amount_cents <> p_amount then return 'amount_mismatch'; end if;
  if v.status in ('valid', 'used') then return 'already'; end if;   -- Redsys reintenta las notificaciones

  update public.tickets set status = 'valid', paid_at = now() where id = v.id;
  if v.status = 'pending' then return 'confirmed'; end if;

  -- Estaba anulada por caducidad: se volvió a poner a la venta su plaza; hay que quitarla otra vez.
  -- Si ya no queda, se entrega igualmente (el cliente ya ha pagado).
  if v.tier_id is not null then
    v_had_stock := public.reserve_ticket_stock(v.tier_id);
    if not v_had_stock then return 'reactivated_oversold'; end if;
  end if;
  return 'reactivated';
end;
$$;

-- Redsys rechaza o cancela un cobro. Anula la entrada pendiente y devuelve la plaza al tramo.
-- Devuelve: not_found | cancelled | ignored (ya estaba pagada o anulada)
create or replace function public.fail_ticket_payment(p_order text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.tickets%rowtype;
begin
  select * into v from public.tickets where order_id = p_order for update;
  if not found then return 'not_found'; end if;
  if v.status <> 'pending' then return 'ignored'; end if;
  update public.tickets set status = 'cancelled' where id = v.id;
  if v.tier_id is not null then perform public.release_ticket_stock(v.tier_id); end if;
  return 'cancelled';
end;
$$;

-- Solo el servidor (service_role) puede ejecutarlas.
revoke all on function public.expire_pending_tickets(integer) from public, anon, authenticated;
revoke all on function public.confirm_ticket_payment(text, integer) from public, anon, authenticated;
revoke all on function public.fail_ticket_payment(text) from public, anon, authenticated;
grant execute on function public.expire_pending_tickets(integer) to service_role;
grant execute on function public.confirm_ticket_payment(text, integer) to service_role;
grant execute on function public.fail_ticket_payment(text) to service_role;

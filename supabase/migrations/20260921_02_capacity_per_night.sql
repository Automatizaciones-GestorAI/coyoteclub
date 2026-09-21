-- Aforo por noche.
--
-- Antes: cada tramo tenía un único contador ("Disponibles") que bajaba con cada venta y valía para TODAS las noches
-- (si el viernes vendía 100, el sábado ya no quedaba nada). Ahora:
--   * events.capacity      = aforo de la noche (personas). NULL = sin límite. Por defecto 264 (aforo del local).
--   * price_tiers.night_limit = entradas máximas de ese tramo POR NOCHE. NULL = sin límite.
-- No hay contadores que descuadrar: lo ocupado se CUENTA (entradas pendientes de pago + pagadas + usadas) y la
-- compra comprueba y guarda dentro de una sola operación que bloquea la noche (dos compras a la vez no se pisan).
-- Una entrada anulada, caducada o devuelta deja de contar sola.
--
-- Compatible con el código anterior: no se borra nada. price_tiers.stock y reserve/release_ticket_stock quedan sin usar.

alter table public.events add column if not exists capacity integer;
alter table public.events drop constraint if exists events_capacity_check;
alter table public.events add constraint events_capacity_check check (capacity is null or capacity >= 0);
update public.events set capacity = 264 where capacity is null;
alter table public.events alter column capacity set default 264;

alter table public.price_tiers add column if not exists night_limit integer;
alter table public.price_tiers drop constraint if exists price_tiers_night_limit_check;
alter table public.price_tiers add constraint price_tiers_night_limit_check check (night_limit is null or night_limit >= 0);
-- Lo que hoy figura como "Disponibles" pasa a ser el límite por noche (aún no se ha vendido nada).
update public.price_tiers set night_limit = stock where night_limit is null and stock is not null and kind <> 'door';

create index if not exists idx_tickets_counted on public.tickets (event_id, tier_id) where status in ('pending', 'valid', 'used');

-- Entradas que ocupan plaza, por noche y tramo.
create or replace function public.night_usage()
returns table (event_id uuid, tier_id uuid, n integer)
language sql
stable
set search_path = ''
as $$
  select t.event_id, t.tier_id, count(*)::integer
    from public.tickets t
   where t.status in ('pending', 'valid', 'used')
   group by t.event_id, t.tier_id;
$$;

-- ¿Se ha pasado el aforo de la noche o el límite del tramo? (se usa DESPUÉS de dar por buena una entrada)
create or replace function public.night_over_limit(p_event uuid, p_tier uuid)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cap integer;
  v_lim integer;
  v_night integer;
  v_tier integer;
begin
  if p_event is not null then select capacity into v_cap from public.events where id = p_event; end if;
  if p_tier is not null then select night_limit into v_lim from public.price_tiers where id = p_tier; end if;
  select count(*)::integer into v_night from public.tickets
   where event_id is not distinct from p_event and status in ('pending', 'valid', 'used');
  select count(*)::integer into v_tier from public.tickets
   where event_id is not distinct from p_event and tier_id = p_tier and status in ('pending', 'valid', 'used');
  return (v_cap is not null and v_night > v_cap) or (v_lim is not null and v_tier > v_lim);
end;
$$;

-- Crea la entrada pendiente de pago SI queda sitio esa noche y en ese tramo. Todo en una sola transacción y con la
-- noche bloqueada, así que aunque lleguen cientos de compras a la vez nunca se pasa el aforo.
-- Devuelve {"ok": true, "id": ...} o {"ok": false, "reason": "night_full" | "tier_full" | "no_tier" | "no_event"}.
create or replace function public.create_pending_ticket(
  p_event uuid, p_tier uuid, p_qr text, p_order text, p_name text, p_phone text, p_email text,
  p_amount integer, p_terms_version text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_cap integer;
  v_lim integer;
  v_night integer;
  v_tier integer;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_event::text, 'sin-noche'), 0));

  select night_limit into v_lim from public.price_tiers where id = p_tier;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_tier'); end if;
  if p_event is not null then
    select capacity into v_cap from public.events where id = p_event;
    if not found then return jsonb_build_object('ok', false, 'reason', 'no_event'); end if;
  end if;

  if v_cap is not null then
    select count(*)::integer into v_night from public.tickets
     where event_id is not distinct from p_event and status in ('pending', 'valid', 'used');
    if v_night >= v_cap then return jsonb_build_object('ok', false, 'reason', 'night_full'); end if;
  end if;
  if v_lim is not null then
    select count(*)::integer into v_tier from public.tickets
     where event_id is not distinct from p_event and tier_id = p_tier and status in ('pending', 'valid', 'used');
    if v_tier >= v_lim then return jsonb_build_object('ok', false, 'reason', 'tier_full'); end if;
  end if;

  insert into public.tickets (qr_code, order_id, event_id, tier_id, buyer_name, buyer_phone, buyer_email, amount_cents,
                              terms_accepted_at, terms_version, status)
  values (p_qr, p_order, p_event, p_tier, p_name, p_phone, p_email, p_amount, now(), p_terms_version, 'pending')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Caducidad y anulaciones: ya no hay contador que restaurar (la entrada anulada deja de contar sola).
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
       set status = 'cancelled', cancel_reason = 'expired', cancelled_at = now()
     where status = 'pending'
       and created_at < now() - make_interval(mins => p_minutes)
    returning id
  )
  select count(*)::integer into v_count from expired;
  return v_count;
end;
$$;

-- Redsys confirma un cobro. Devuelve: not_found | amount_mismatch | already | confirmed | reactivated | reactivated_oversold
-- (reactivated = el pago llegó tarde, con la reserva ya caducada: se respeta el cobro; _oversold = y ya no quedaba sitio).
create or replace function public.confirm_ticket_payment(p_order text, p_amount integer)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.tickets%rowtype;
begin
  select * into v from public.tickets where order_id = p_order for update;
  if not found then return 'not_found'; end if;
  if v.amount_cents is not null and v.amount_cents <> p_amount then return 'amount_mismatch'; end if;
  if v.status in ('valid', 'used') then return 'already'; end if;

  update public.tickets
     set status = 'valid', paid_at = now(), cancel_reason = null, cancelled_at = null
   where id = v.id;
  if v.status = 'pending' then return 'confirmed'; end if;

  if public.night_over_limit(v.event_id, v.tier_id) then return 'reactivated_oversold'; end if;
  return 'reactivated';
end;
$$;

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
  update public.tickets set status = 'cancelled', cancel_reason = 'payment_failed', cancelled_at = now() where id = v.id;
  return 'cancelled';
end;
$$;

create or replace function public.admin_mark_ticket_paid(p_ticket uuid, p_actor text default null)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.tickets%rowtype;
  v_result text := 'marked_paid';
begin
  select * into v from public.tickets where id = p_ticket for update;
  if not found then return 'not_found'; end if;
  if v.status in ('valid', 'used') then return 'already'; end if;
  update public.tickets
     set status = 'valid', paid_at = coalesce(paid_at, now()), cancel_reason = null, cancelled_at = null, reviewed_at = now()
   where id = v.id;
  if v.status = 'cancelled' and public.night_over_limit(v.event_id, v.tier_id) then v_result := 'marked_paid_oversold'; end if;
  insert into public.ticket_audit (ticket_id, action, detail, actor) values (v.id, 'mark_paid', jsonb_build_object('from', v.status, 'result', v_result), p_actor);
  return v_result;
end;
$$;

create or replace function public.admin_cancel_ticket(p_ticket uuid, p_reason text, p_actor text default null)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.tickets%rowtype;
begin
  if p_reason is null or p_reason not in ('manual', 'refunded') then return 'bad_reason'; end if;
  select * into v from public.tickets where id = p_ticket for update;
  if not found then return 'not_found'; end if;
  if v.status = 'used' then return 'used'; end if;
  if v.status = 'cancelled' then
    update public.tickets set cancel_reason = p_reason, reviewed_at = now() where id = v.id;
    insert into public.ticket_audit (ticket_id, action, detail, actor) values (v.id, 'cancel', jsonb_build_object('from', v.status, 'reason', p_reason, 'already', true), p_actor);
    return 'already';
  end if;
  update public.tickets
     set status = 'cancelled', cancel_reason = p_reason, cancelled_at = now(), reviewed_at = now()
   where id = v.id;
  insert into public.ticket_audit (ticket_id, action, detail, actor) values (v.id, 'cancel', jsonb_build_object('from', v.status, 'reason', p_reason), p_actor);
  return 'cancelled';
end;
$$;

-- Devuelve: not_found | already_used | not_allowed | used | let_in | let_in_oversold
create or replace function public.admin_let_in(p_ticket uuid, p_note text default null, p_actor text default null)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.tickets%rowtype;
  v_result text;
begin
  select * into v from public.tickets where id = p_ticket for update;
  if not found then return 'not_found'; end if;
  if v.status = 'used' then return 'already_used'; end if;
  -- Una entrada devuelta, anulada a mano o con el pago rechazado NO se puede dar por buena en la puerta.
  if v.status = 'cancelled' and v.cancel_reason in ('refunded', 'manual', 'payment_failed') then return 'not_allowed'; end if;
  if v.status = 'valid' then
    update public.tickets set status = 'used', used_at = now(), used_by = p_actor where id = v.id;
    insert into public.ticket_audit (ticket_id, action, detail, actor) values (v.id, 'mark_used', null, p_actor);
    return 'used';
  end if;
  v_result := 'let_in';
  update public.tickets
     set status = 'used', used_at = now(), used_by = p_actor, paid_at = coalesce(paid_at, now()), cancel_reason = null, cancelled_at = null,
         manual_override = true, reviewed_at = null
   where id = v.id;
  if v.status = 'cancelled' and public.night_over_limit(v.event_id, v.tier_id) then v_result := 'let_in_oversold'; end if;
  insert into public.ticket_audit (ticket_id, action, detail, actor)
  values (v.id, 'let_in', jsonb_build_object('from', v.status, 'note', p_note, 'result', v_result), p_actor);
  return v_result;
end;
$$;

-- Solo el servidor (service_role) puede ejecutarlas.
revoke all on function public.night_usage() from public, anon, authenticated;
revoke all on function public.night_over_limit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_pending_ticket(uuid, uuid, text, text, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.night_usage() to service_role;
grant execute on function public.night_over_limit(uuid, uuid) to service_role;
grant execute on function public.create_pending_ticket(uuid, uuid, text, text, text, text, text, integer, text) to service_role;

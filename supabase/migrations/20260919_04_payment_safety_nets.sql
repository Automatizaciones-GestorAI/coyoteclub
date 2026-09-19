-- Red de seguridad para los cobros: qué pasó con cada aviso del banco, por qué se anuló cada entrada
-- y las acciones manuales del club (marcar como pagada, anular/devolver, marcar como usada).

alter table public.tickets
  add column if not exists cancel_reason text,      -- expired | payment_failed | manual | refunded
  add column if not exists cancelled_at timestamptz,
  add column if not exists reviewed_at timestamptz, -- el club ya ha mirado esta incidencia
  add column if not exists manual_override boolean not null default false; -- dada a mano en la puerta sin aviso del banco

alter table public.tickets drop constraint if exists tickets_cancel_reason_check;
alter table public.tickets add constraint tickets_cancel_reason_check
  check (cancel_reason is null or cancel_reason = any (array['expired'::text, 'payment_failed'::text, 'manual'::text, 'refunded'::text]));

-- Registro de TODOS los avisos de Redsys (para poder revisar cualquier disputa).
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  ticket_id uuid references public.tickets (id) on delete set null,
  ds_response text,
  amount_cents integer,
  outcome text not null,
  raw jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_events_created on public.payment_events (created_at desc);
create index if not exists idx_payment_events_order on public.payment_events (order_id);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;
-- Cada acción manual del club queda anotada (quién decide algo a mano deja rastro).
create table if not exists public.ticket_audit (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets (id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_audit_ticket on public.ticket_audit (ticket_id, created_at desc);
alter table public.ticket_audit enable row level security;
revoke all on public.ticket_audit from anon, authenticated;
create index if not exists idx_tickets_manual_review on public.tickets (created_at) where manual_override and reviewed_at is null;
create index if not exists idx_tickets_cancel_review on public.tickets (created_at) where status = 'cancelled' and cancel_reason = 'expired' and reviewed_at is null;

-- Las funciones de estado ahora dejan constancia del motivo de la anulación.
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
  if v.status in ('valid', 'used') then return 'already'; end if;

  update public.tickets
     set status = 'valid', paid_at = now(), cancel_reason = null, cancelled_at = null
   where id = v.id;
  if v.status = 'pending' then return 'confirmed'; end if;

  if v.tier_id is not null then
    v_had_stock := public.reserve_ticket_stock(v.tier_id);
    if not v_had_stock then return 'reactivated_oversold'; end if;
  end if;
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
  if v.tier_id is not null then perform public.release_ticket_stock(v.tier_id); end if;
  return 'cancelled';
end;
$$;

-- El club ha comprobado en Redsys que SÍ cobró: la entrada pasa a válida.
-- Devuelve: not_found | already | marked_paid | marked_paid_oversold
create or replace function public.admin_mark_ticket_paid(p_ticket uuid)
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
  -- Una entrada "pending" ya tiene su plaza reservada; una anulada la había devuelto: hay que quitarla otra vez.
  if v.status = 'cancelled' and v.tier_id is not null then
    if not public.reserve_ticket_stock(v.tier_id) then v_result := 'marked_paid_oversold'; end if;
  end if;
  insert into public.ticket_audit (ticket_id, action, detail) values (v.id, 'mark_paid', jsonb_build_object('from', v.status, 'result', v_result));
  return v_result;
end;
$$;

-- Anula una entrada (error, duplicada o devuelta en Redsys) y devuelve su plaza al tramo.
-- p_reason: manual | refunded. Devuelve: bad_reason | not_found | used | already | cancelled
create or replace function public.admin_cancel_ticket(p_ticket uuid, p_reason text)
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
  if v.status = 'used' then return 'used'; end if;   -- ya ha entrado: no se anula
  if v.status = 'cancelled' then
    update public.tickets set cancel_reason = p_reason, reviewed_at = now() where id = v.id;
    insert into public.ticket_audit (ticket_id, action, detail) values (v.id, 'cancel', jsonb_build_object('from', v.status, 'reason', p_reason, 'already', true));
    return 'already';
  end if;
  update public.tickets
     set status = 'cancelled', cancel_reason = p_reason, cancelled_at = now(), reviewed_at = now()
   where id = v.id;
  if v.tier_id is not null then perform public.release_ticket_stock(v.tier_id); end if;
  insert into public.ticket_audit (ticket_id, action, detail) values (v.id, 'cancel', jsonb_build_object('from', v.status, 'reason', p_reason));
  return 'cancelled';
end;
$$;

-- Entrada manual en la puerta de una entrada válida (por si el QR no se lee). Devuelve: used | not_valid
create or replace function public.admin_mark_ticket_used(p_ticket uuid)
returns text
language plpgsql
set search_path = ''
as $$
begin
  update public.tickets set status = 'used', used_at = now() where id = p_ticket and status = 'valid';
  if not found then return 'not_valid'; end if;
  insert into public.ticket_audit (ticket_id, action, detail) values (p_ticket, 'mark_used', null);
  return 'used';
end;
$$;

-- El cliente dice que ha pagado y en la puerta su entrada no vale: el portero, tras ver el cargo en el
-- móvil del cliente, le da entrada. Queda marcada "dada a mano" para que el club compruebe el cobro en
-- Redsys después. Devuelve: not_found | already_used | used | let_in | let_in_oversold
create or replace function public.admin_let_in(p_ticket uuid, p_note text default null)
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
  if v.status = 'used' then return 'already_used'; end if;   -- nunca se deja pasar dos veces con la misma entrada
  if v.status = 'valid' then
    update public.tickets set status = 'used', used_at = now() where id = v.id;
    insert into public.ticket_audit (ticket_id, action, detail) values (v.id, 'mark_used', null);
    return 'used';
  end if;
  v_result := 'let_in';
  update public.tickets
     set status = 'used', used_at = now(), paid_at = coalesce(paid_at, now()), cancel_reason = null, cancelled_at = null,
         manual_override = true, reviewed_at = null
   where id = v.id;
  if v.status = 'cancelled' and v.tier_id is not null then
    if not public.reserve_ticket_stock(v.tier_id) then v_result := 'let_in_oversold'; end if;
  end if;
  insert into public.ticket_audit (ticket_id, action, detail)
  values (v.id, 'let_in', jsonb_build_object('from', v.status, 'note', p_note, 'result', v_result));
  return v_result;
end;
$$;

revoke all on function public.admin_mark_ticket_paid(uuid) from public, anon, authenticated;
revoke all on function public.admin_cancel_ticket(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_mark_ticket_used(uuid) from public, anon, authenticated;
revoke all on function public.admin_let_in(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_mark_ticket_paid(uuid) to service_role;
grant execute on function public.admin_cancel_ticket(uuid, text) to service_role;
grant execute on function public.admin_mark_ticket_used(uuid) to service_role;
grant execute on function public.admin_let_in(uuid, text) to service_role;

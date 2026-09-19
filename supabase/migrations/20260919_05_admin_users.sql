-- Usuarios del panel: usuario + contraseña por persona, con dos perfiles (admin y door = puerta).
-- Solo el servidor (service_role) puede leer o escribir esta tabla.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text,
  password_hash text not null,                 -- scrypt$N$r$p$sal$hash (nunca la contraseña)
  role text not null,
  can_manage_users boolean not null default false,  -- solo GestorAI: puede crear y gestionar usuarios
  is_active boolean not null default true,
  password_changed_at timestamptz not null default now(), -- las sesiones anteriores dejan de valer
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.admin_users drop constraint if exists admin_users_username_check;
alter table public.admin_users add constraint admin_users_username_check check (username ~ '^[a-z0-9._-]{3,30}$');
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check check (role = any (array['admin'::text, 'door'::text]));
alter table public.admin_users drop constraint if exists admin_users_manager_is_admin;
alter table public.admin_users add constraint admin_users_manager_is_admin check (not can_manage_users or role = 'admin');
create unique index if not exists admin_users_username_key on public.admin_users (username);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

-- Siempre debe quedar al menos un usuario activo capaz de gestionar usuarios (si no, nadie podría arreglar nada).
create or replace function public.admin_users_keep_a_manager()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' and old.can_manage_users and old.is_active)
     or (tg_op = 'UPDATE' and old.can_manage_users and old.is_active and (not new.can_manage_users or not new.is_active)) then
    perform pg_advisory_xact_lock(hashtext('admin_users_manager'));
    if not exists (select 1 from public.admin_users u where u.can_manage_users and u.is_active and u.id <> old.id) then
      raise exception 'Debe quedar al menos un usuario activo que pueda gestionar usuarios' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists admin_users_keep_a_manager on public.admin_users;
create trigger admin_users_keep_a_manager before update or delete on public.admin_users
  for each row execute function public.admin_users_keep_a_manager();

-- Quién hace cada cosa: acciones a mano y quién escaneó cada entrada.
alter table public.ticket_audit add column if not exists actor text;
alter table public.tickets add column if not exists used_by text;

-- Las funciones de acciones manuales reciben ahora el nombre de quien las hace.
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
  if v.status = 'cancelled' and v.tier_id is not null then
    if not public.reserve_ticket_stock(v.tier_id) then v_result := 'marked_paid_oversold'; end if;
  end if;
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
  if v.tier_id is not null then perform public.release_ticket_stock(v.tier_id); end if;
  insert into public.ticket_audit (ticket_id, action, detail, actor) values (v.id, 'cancel', jsonb_build_object('from', v.status, 'reason', p_reason), p_actor);
  return 'cancelled';
end;
$$;

create or replace function public.admin_mark_ticket_used(p_ticket uuid, p_actor text default null)
returns text
language plpgsql
set search_path = ''
as $$
begin
  update public.tickets set status = 'used', used_at = now(), used_by = p_actor where id = p_ticket and status = 'valid';
  if not found then return 'not_valid'; end if;
  insert into public.ticket_audit (ticket_id, action, detail, actor) values (p_ticket, 'mark_used', null, p_actor);
  return 'used';
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
  -- Una entrada devuelta, anulada a mano o con el pago rechazado NO se puede dar por buena en la puerta:
  -- el cargo que enseñe el cliente sería de un dinero ya devuelto (o de un intento que el banco no cobró).
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
  if v.status = 'cancelled' and v.tier_id is not null then
    if not public.reserve_ticket_stock(v.tier_id) then v_result := 'let_in_oversold'; end if;
  end if;
  insert into public.ticket_audit (ticket_id, action, detail, actor)
  values (v.id, 'let_in', jsonb_build_object('from', v.status, 'note', p_note, 'result', v_result), p_actor);
  return v_result;
end;
$$;

-- Las versiones anteriores (sin el nombre de quien actúa) se sustituyen por las nuevas.
drop function if exists public.admin_mark_ticket_paid(uuid);
drop function if exists public.admin_cancel_ticket(uuid, text);
drop function if exists public.admin_mark_ticket_used(uuid);
drop function if exists public.admin_let_in(uuid, text);

revoke all on function public.admin_mark_ticket_paid(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_cancel_ticket(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_mark_ticket_used(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_let_in(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_mark_ticket_paid(uuid, text) to service_role;
grant execute on function public.admin_cancel_ticket(uuid, text, text) to service_role;
grant execute on function public.admin_mark_ticket_used(uuid, text) to service_role;
grant execute on function public.admin_let_in(uuid, text, text) to service_role;

-- La función del disparador no debe poder ejecutarse desde fuera.
revoke all on function public.admin_users_keep_a_manager() from public, anon, authenticated;

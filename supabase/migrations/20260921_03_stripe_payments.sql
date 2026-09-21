-- Cobro con Stripe (sustituye a Redsys). La entrada sigue naciendo "pending" y pasa a "valid" cuando Stripe avisa del cobro.
-- Solo se añade: nada de lo anterior se toca (las funciones confirm_ticket_payment y fail_ticket_payment se siguen usando).

alter table public.tickets add column if not exists stripe_session_id text;   -- sesión de pago de Stripe (cs_...)
alter table public.tickets add column if not exists payment_intent text;      -- cobro en Stripe (pi_...), sirve para localizar devoluciones

create unique index if not exists tickets_stripe_session_key on public.tickets (stripe_session_id) where stripe_session_id is not null;
create index if not exists tickets_payment_intent_idx on public.tickets (payment_intent) where payment_intent is not null;

-- Anula una entrada PENDIENTE por su nº de pedido: expired (la sesión de pago caducó) o payment_failed (el cliente canceló o el pago falló).
-- p_confirmed = Stripe ha confirmado que no hubo cobro: la entrada queda ya revisada y no aparece en "Por revisar".
-- Devuelve: not_found | bad_reason | ignored (ya no estaba pendiente) | cancelled
create or replace function public.cancel_pending_order(p_order text, p_reason text, p_confirmed boolean default false)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.tickets%rowtype;
begin
  if p_reason is null or p_reason not in ('expired', 'payment_failed') then return 'bad_reason'; end if;
  select * into v from public.tickets where order_id = p_order for update;
  if not found then return 'not_found'; end if;
  if v.status <> 'pending' then return 'ignored'; end if;
  update public.tickets
     set status = 'cancelled', cancel_reason = p_reason, cancelled_at = now(),
         reviewed_at = case when p_confirmed then now() else reviewed_at end
   where id = v.id;
  return 'cancelled';
end;
$$;

revoke all on function public.cancel_pending_order(text, text, boolean) from public, anon, authenticated;
grant execute on function public.cancel_pending_order(text, text, boolean) to service_role;

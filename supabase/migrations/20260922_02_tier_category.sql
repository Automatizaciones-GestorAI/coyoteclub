-- Categoría del tramo: "entrada" (acceso general: pagas por entrar) o "consumicion" (oferta de copas/bonos,
-- p. ej. BONOCOPAS: su valor no depende de si la entrada es gratis o no).
--
-- Sirve para las noches de entrada gratuita (events.free_entry): los tramos de tipo "entrada" dejan de
-- ofrecerse esa noche (no tiene sentido cobrar solo por entrar si es gratis), pero los de "consumicion"
-- se siguen vendiendo con normalidad, Stripe incluido.
--
-- Por defecto "entrada", para que los tramos que ya existen se comporten exactamente igual que hasta ahora.

alter table public.price_tiers add column if not exists category text not null default 'entrada';
alter table public.price_tiers drop constraint if exists price_tiers_category_check;
alter table public.price_tiers add constraint price_tiers_category_check check (category in ('entrada', 'consumicion'));

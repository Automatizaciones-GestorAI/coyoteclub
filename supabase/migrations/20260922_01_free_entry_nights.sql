-- Noches de entrada gratuita (p. ej.: "hasta dentro de 2 semanas no se cobra el viernes").
--
-- Cuando una noche tiene free_entry = true, esa noche desaparece del selector de compra de /entradas y su
-- tarjeta en la portada deja de enlazar a la compra: no se llega a llamar a Stripe para nada de esa noche.
-- No se crea entrada ni QR para quien entra gratis (no hay nada que cobrar ni que validar), así que tampoco
-- cuenta para el aforo online: el control en puerta de una noche gratuita es manual, como ya lo es hoy el
-- pago en taquilla.

alter table public.events add column if not exists free_entry boolean not null default false;

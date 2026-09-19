# Coyote Club — Panel de administración

Panel `/admin` para gestionar eventos, precios y galería, más venta de
entradas con QR y cobro por Redsys.

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` a `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`: sácalas del
     proyecto Supabase "Coyote Club" → Project Settings → API.
   - `ADMIN_PASSWORD`: la contraseña con la que entrarás en `/admin`.
   - `ADMIN_SESSION_SECRET`: cualquier cadena larga y aleatoria.
   - `REDSYS_MERCHANT_CODE`, `REDSYS_TERMINAL`, `REDSYS_SECRET_KEY`: te los da
     el banco al dar de alta el TPV virtual del cliente. Mientras no los
     tengas, deja `REDSYS_ENV=test` y usa las claves de prueba de Redsys.
   - `NEXT_PUBLIC_SITE_URL`: la URL pública donde despliegues esto.
3. `npm run dev` para probar en local.

## Rutas

- `/admin` — panel (pide contraseña en `/admin/login`)
- `/admin/events` — crear/editar/borrar eventos y su cartel
- `/admin/pricing` — editar los tramos de precio (Bonocopas, Tramo 1, Tramo 2, Taquilla)
- `/admin/gallery` — subir/quitar fotos de la galería
- `/scan` — abrir desde el móvil en la puerta para escanear las entradas (QR)
- `/ticket/[qr_code]` — página que ve el comprador con su entrada y QR
- `/entradas` — página pública de compra: el cliente elige tramo, pone su nombre y teléfono, y se le redirige a Redsys a pagar

## Despliegue (mismo flujo que Rememberos)

1. Sube este proyecto a un repo de GitHub.
2. En EasyPanel: crea un servicio nuevo desde ese repo (usa el Dockerfile de
   la raíz), y configura ahí las mismas variables de entorno del `.env.example`.
3. Autodeploy con cada push a `main`, como el resto de tus proyectos.

## Nota sobre la base de datos

Usa un proyecto Supabase **separado** del de Rememberos, llamado "Coyote Club"
(mismo organización `Automatizaciones-GestorAI`). Las tablas ya están creadas
con las migraciones aplicadas: `events`, `price_tiers`, `gallery_images`,
`tickets`. Los 4 tramos de precio actuales (Bonocopas 20€/3 consumiciones,
Tramo 1 8€, Tramo 2 10€, Taquilla 15€) y los 2 eventos de esta semana ya están
cargados como datos iniciales.

## Cobro con Redsys

Ya está preparado de punta a punta (entrada pendiente → aviso firmado de Redsys → entrada válida con QR,
caducidad de reservas, control de aforo por tramo). Guía para activarlo con los datos del banco:
[`docs/PUESTA-EN-MARCHA-REDSYS.md`](docs/PUESTA-EN-MARCHA-REDSYS.md).

## Base de datos

Los cambios de esquema están en `supabase/migrations/` (aplicados en producción). Todas las tablas tienen la
seguridad por filas activada y **sin políticas**: solo el servidor (clave `service_role`/secreta) puede leer y
escribir; la clave pública no puede nada. No añadas políticas sin pensarlo.

## Pendiente

- Textos legales y envío de la entrada por email (ver la guía de Redsys). Protocolo de puerta e incidencias: `docs/PUERTA-E-INCIDENCIAS.md`.
- `/entradas` y la portada: maquetado ya adaptado a móvil.

# Coyote Club — Panel de administración

Panel `/admin` para gestionar eventos, precios y galería, más venta de
entradas con QR y cobro con Stripe.

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` a `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`: sácalas del
     proyecto Supabase "Coyote Club" → Project Settings → API.
   - `ADMIN_PASSWORD`: la contraseña con la que entrarás en `/admin`.
   - `ADMIN_SESSION_SECRET`: cualquier cadena larga y aleatoria.
   - `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`: de la cuenta de Stripe del
     cliente (guía en `docs/PUESTA-EN-MARCHA-STRIPE.md`). Mientras no los tengas,
     «Comprar» avisa de que el pago aún no está disponible.
   - `NEXT_PUBLIC_SITE_URL` (opcional): la URL pública donde despliegues esto.
3. `npm run dev` para probar en local.

## Rutas

- `/admin` — panel (usuario y contraseña en `/admin/login`; cada persona tiene el suyo, con perfil Administrador o Puerta)
- `/admin/events` — crear/editar/borrar eventos y su cartel
- `/admin/pricing` — editar los tramos de precio (Bonocopas, Tramo 1, Tramo 2, Taquilla)
- `/admin/gallery` — subir/quitar fotos de la galería
- `/scan` — abrir desde el móvil en la puerta para escanear las entradas (QR)
- `/ticket/[qr_code]` — página que ve el comprador con su entrada y QR
- `/entradas` — página pública de compra: el cliente elige tramo, pone su nombre y teléfono, y se le lleva a pagar a Stripe

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

## Usuarios y perfiles

- **Administrador:** ve y cambia todo (ventas, entradas, eventos, precios, galería, escáner).
- **Puerta:** solo escáner y buscar entradas (dar entrada); no ve ingresos ni toca precios.
- El apartado **Usuarios** (crear, desactivar, cambiar contraseña o perfil) solo lo ve quien tiene el permiso «gestiona usuarios»
  (GestorAI). Cada persona cambia su contraseña en **Mi cuenta**.
- **Primer acceso tras desplegar:** entra con usuario `admin` y la contraseña de `ADMIN_PASSWORD`: crea el usuario inicial.
  Después conviene cambiarla en Mi cuenta y crear los usuarios de cada persona.
- Desactivar a alguien o cambiarle la contraseña cierra sus sesiones al instante. Siempre queda al menos un gestor activo.
- Las acciones a mano (dar entrada, dar por pagada, anular…) y quién escaneó cada entrada quedan anotadas con el usuario.

## Cobro con Stripe

Ya está preparado de punta a punta (entrada pendiente → página de pago de Stripe → aviso firmado + comprobación a Stripe al volver →
entrada válida con QR, reservas que caducan a los 31 min, devoluciones que anulan la entrada solas, aforo por noche).
Guía para activarlo con las claves del cliente: [`docs/PUESTA-EN-MARCHA-STRIPE.md`](docs/PUESTA-EN-MARCHA-STRIPE.md).

## Base de datos

Los cambios de esquema están en `supabase/migrations/` (aplicados en producción). Todas las tablas tienen la
seguridad por filas activada y **sin políticas**: solo el servidor (clave `service_role`/secreta) puede leer y
escribir; la clave pública no puede nada. No añadas políticas sin pensarlo.

## Pendiente

- Envío de la entrada por email (no hecho). Textos legales, cookies y logos de pago: hechos, faltan los datos del titular (`docs/TEXTOS-LEGALES.md`). Protocolo de puerta e incidencias: `docs/PUERTA-E-INCIDENCIAS.md`.
- `/entradas` y la portada: maquetado ya adaptado a móvil.

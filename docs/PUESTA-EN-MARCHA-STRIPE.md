# Puesta en marcha del cobro online (Stripe)

La web ya está preparada: cuando tengas las claves de Stripe solo hay que pegarlas en EasyPanel y desplegar. Mientras no
estén, el botón "Comprar" responde con un aviso amable ("El pago online todavía no está disponible") y **no se crea ni se
gasta ninguna entrada**. El panel (**Ventas**) te dice en todo momento si el cobro está listo y qué falta.

**Importante:** los cobros van a **la cuenta de Stripe de quien vende** (el titular del negocio). No uses la cuenta de pruebas de
GestorAI para cobrar de verdad.

## 1. Cuenta de Stripe del cliente

1. Crear la cuenta en <https://dashboard.stripe.com/register> a nombre del titular (los mismos datos que en `/aviso-legal`).
2. Activar la cuenta (Stripe pide identidad, actividad y el IBAN donde ingresará los cobros). Se puede probar todo antes en **modo pruebas**.
3. En **Configuración → Datos públicos**: nombre de la empresa «Coyote Club» y **descripción en el extracto = `COYOTE CLUB`**
   (es lo que el cliente verá en su banco; en la puerta se le pide justo ese cargo).
4. En **Configuración → Marca**: logo de Coyote Club y color `#ff149c` (así se ve la página de pago).
5. En **Configuración → Métodos de pago**: dejar activada la tarjeta (Apple Pay y Google Pay salen solos). Lo que se active aquí aparece en la página de pago sin tocar la web.
6. En **Configuración → Correos de clientes**: activar «Pagos correctos» para que el cliente reciba el recibo.

## 2. Claves (Desarrolladores → Claves de API)

| Dato | Variable | Cómo es |
|---|---|---|
| Clave secreta | `STRIPE_SECRET_KEY` | `sk_test_…` (pruebas) o `sk_live_…` (real). **Nunca la pública (`pk_`)** |
| Secreto del aviso | `STRIPE_WEBHOOK_SECRET` | `whsec_…` (lo da Stripe al crear el aviso, punto 3) |

Recomendado: en vez de la clave secreta completa, crea una **clave restringida** (`rk_…`) con un único permiso:
**Checkout Sessions → Escritura**. La web no necesita nada más.

## 3. El aviso (webhook) de Stripe

Es cómo Stripe le dice a la web «este pago se ha completado / ha caducado / se ha devuelto». **Desarrolladores → Webhooks → Añadir punto de conexión**:

- **URL:** `https://TU-DOMINIO/api/checkout/stripe/webhook`
- **Eventos** (los seis):
  `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `charge.refunded`, `charge.dispute.created`
- Al crearlo, Stripe enseña el **secreto de firma** (`whsec_…`): es `STRIPE_WEBHOOK_SECRET`.

Los modos **pruebas y real tienen avisos y secretos distintos**: hay que crear uno en cada modo.

## 4. Variables en EasyPanel (servicio `coyote-club / web` → Entorno)

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx          # sk_live_… solo al pasar a real
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
ADMIN_PASSWORD=<contraseña larga, 16+ caracteres>
ADMIN_SESSION_SECRET=<aleatorio, 48+ caracteres>    # p. ej. `openssl rand -base64 48`
```

`NEXT_PUBLIC_SITE_URL` es opcional: si no está, la web usa la dirección por la que la visitan (así sirve con el dominio provisional y con el propio).
Después: **Deploy**. En el panel → **Ventas** debe aparecer «Cobro online (Stripe): listo en modo pruebas». Si algo falla, ahí mismo se
indica qué variable falta o es incorrecta (nunca muestra los valores).

## 5. Prueba en modo pruebas (sin dinero real)

Tarjetas de prueba de Stripe (caducidad futura, CVC y código postal cualquiera): `4242 4242 4242 4242` (pago correcto),
`4000 0027 6000 3184` (pide verificación 3D Secure), `4000 0000 0000 0002` (rechazada).

1. En la web, `/entradas` → elige tramo y noche → acepta las condiciones → «Ir a pagar». Debe abrirse la página de pago de Stripe.
2. Paga con `4242…`. Debe volver a la web y enseñar la entrada con su **QR** al momento. En **Ventas** sube el importe.
3. Comprueba en **Ventas** que aparece «Último aviso recibido de Stripe» (si no aparece, el aviso del punto 3 está mal puesto).
4. Empieza otra compra y pulsa **«volver»** en la página de Stripe: debe volver a `/entradas` con el aviso «no se ha cobrado nada» y la plaza queda libre.
5. En Stripe → **Pagos**, abre el pago del punto 2 → **Reembolsar**. En **Entradas** la entrada pasa sola a «Devuelta».
6. Escanea el QR de una entrada válida con `/scan`: la primera vez vale, la segunda dice «Ya se usó».

## 6. Paso al entorno real

Cuando la cuenta esté activada: cambia `STRIPE_SECRET_KEY` por la real (`sk_live_…`), crea el aviso del punto 3 **en modo real** y pon su
nuevo `STRIPE_WEBHOOK_SECRET`, y despliega. Haz una compra real del tramo más barato y devuélvela desde Stripe.

## Cómo funciona por dentro (por si algo no cuadra)

- Al pulsar "Ir a pagar" se crea la entrada en estado **pending** (reservando su plaza en esa noche) y se abre una **sesión de pago** en Stripe
  que caduca a los **31 minutos**. Stripe avisa cuando caduca y la entrada se anula sola, liberando la plaza.
- Cuando el cliente paga, ocurren **dos cosas independientes** (si una falla, la otra lo cubre): Stripe avisa a la web (webhook) y el cliente
  vuelve a `/api/checkout/return`, donde la web **pregunta a Stripe** si está cobrado antes de activar la entrada. Nunca se fía de la dirección.
- Si el cliente pulsa «volver» sin pagar, su reserva se anula al momento y se cierra su página de pago en Stripe.
- Si Stripe no puede crear la página de pago, la reserva se borra y el cliente ve un error para reintentar.
- **Devoluciones:** se hacen en el panel de Stripe; si son totales, la entrada se anula sola («Devuelta»). Las parciales y las **disputas**
  (el cliente reclama el cargo a su banco) quedan en «Por revisar».
- Se guardan todos los avisos (estado, importe, referencia; **nunca el número de tarjeta**, que la web no ve).
- Los avisos que necesitan revisión (`amount_mismatch`, `reactivated_oversold`, `not_found`, `dispute`…) salen como error en los logs (busca `"evt":"stripe"`).

## Limitaciones conocidas

- **El comprador solo recibe su entrada en pantalla** (Stripe le envía el recibo por email, pero no la entrada): la página le pide guardar el
  enlace o hacer una captura. Un envío de la entrada por email requiere un servicio de correo propio (Stripe ya nos da su email).
- **Textos legales:** faltan los datos del titular (ver `docs/TEXTOS-LEGALES.md`).
- Las comisiones de Stripe las cobra Stripe al cliente; no las gestiona la web.

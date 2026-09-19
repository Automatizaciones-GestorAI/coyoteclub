# Puesta en marcha del cobro online (Redsys)

La web ya está preparada: cuando tengas los datos del banco solo hay que pegarlos en EasyPanel y desplegar.
Mientras no estén, el botón "Comprar" responde con un aviso amable ("El pago online todavía no está
disponible") y **no se crea ni se gasta ninguna entrada**. El panel (**Ventas**) te dice en todo momento
si el cobro está listo y qué falta.

## 1. Qué pedirle al banco

Alta de un **TPV Virtual (Redsys, redirección)** a nombre del titular del negocio. Te darán:

| Dato | Variable | Ejemplo |
|---|---|---|
| Código de comercio (FUC) | `REDSYS_MERCHANT_CODE` | 9 dígitos |
| Terminal | `REDSYS_TERMINAL` | `001` |
| Clave de firma SHA-256 | `REDSYS_SECRET_KEY` | 32 caracteres (base64) |

Pídeles también que dejen activada la **notificación online (HTTP)**: es el aviso que Redsys envía a la web
cuando un pago se completa. Sin ella las entradas se quedarían pendientes.

Suelen dar primero el entorno de **pruebas** y, cuando validan la web, el **real** (con otros datos).

## 2. Lo que suelen revisar los bancos en la web (pendiente: necesita datos del titular)

Antes de activar el entorno real el banco revisa que la web muestre: datos del titular (nombre o razón social,
NIF, dirección, email/teléfono), política de privacidad, condiciones de compra y devoluciones, cookies y los
logotipos Visa/Mastercard, con precios con IVA incluido. **Aún no están creadas**: hacen falta los datos legales
del titular y conviene que las revise un gestor. (Tratamos nombre y teléfono de los compradores: hay que
informarles conforme al RGPD.)

## 3. Variables en EasyPanel (servicio `coyote-club / web` → Entorno)

```
NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO-FINAL        # con https://, sin barra final
REDSYS_MERCHANT_CODE=xxxxxxxxx
REDSYS_TERMINAL=001
REDSYS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REDSYS_ENV=test                                      # "live" solo cuando el banco active el real
ADMIN_PASSWORD=<contraseña larga, 16+ caracteres>
ADMIN_SESSION_SECRET=<aleatorio, 48+ caracteres>     # p. ej. `openssl rand -base64 48`
```

Después: **Deploy**. En el panel → **Ventas** debe aparecer "Cobro online: listo en modo pruebas". Si algo
falla, ahí mismo se indica qué variable falta o es incorrecta (nunca muestra los valores).

Cambiar `ADMIN_SESSION_SECRET` cierra todas las sesiones abiertas del panel y del escáner.

## 4. Prueba en modo pruebas (sin dinero real)

1. En la web, `/entradas` → elige tramo y noche → "Ir a pagar". Debe abrirse la pasarela de Redsys de pruebas.
2. Paga con una tarjeta de pruebas (Redsys las publica en su documentación, https://pagosonline.redsys.es;
   la habitual es `4548 8120 4940 0004`, caducidad futura, CVV `123`, código 3D Secure `123456`; verifícalo allí).
3. Debe volver a `/ticket/…` con el **QR**. En **Ventas** sube el importe y el contador.
4. Repite cancelando el pago o con una tarjeta rechazada: debe volver a `/entradas` con el aviso y la
   entrada queda anulada (el tramo recupera su plaza).
5. Escanea el QR con `/scan`: la primera vez vale, la segunda dice "Ya se usó".

## 5. Paso al entorno real

Cuando el banco active el comercio real: cambia `REDSYS_MERCHANT_CODE` y `REDSYS_SECRET_KEY` por los reales
(suelen ser distintos de los de pruebas), pon `REDSYS_ENV=live` y despliega. Haz una compra real del tramo más
barato y devuélvela desde el módulo de administración de Redsys.

## Cómo funciona por dentro (por si algo no cuadra)

- Al pulsar "Ir a pagar" se crea la entrada en estado **pending** y se **reserva una plaza** del tramo.
- Redsys avisa a `/api/checkout/redsys/notify` (firma verificada). Si el pago es correcto y el importe coincide,
  pasa a **valid** y el QR ya sirve. Si lo rechazan, se **anula** y la plaza vuelve al tramo.
- Una entrada `pending` que no se paga en **20 minutos** se anula sola y devuelve la plaza.
- Si el cliente paga justo después de que caduque, **se respeta el cobro** (la entrada pasa a válida).
- La página de la entrada solo enseña el QR cuando el banco lo ha confirmado.
- Los avisos de Redsys quedan en los logs del servicio (busca `redsys_notify`). Los que necesitan revisión
  (`amount_mismatch`, `reactivated_oversold`, `not_found`) salen como error.

## Pendiente / limitaciones conocidas

- **Devoluciones:** se hacen en el módulo de administración de Redsys; la web aún no tiene botón para marcar la
  entrada como cancelada (hoy se haría a mano en la base de datos).
- **El comprador solo recibe su entrada en pantalla** (no hay email/SMS): la página le pide guardar el enlace o
  hacer una captura. Un envío por email requiere contratar un servicio de correo.
- **Textos legales** (punto 2).
- La prueba completa con el aviso real de Redsys (`notify`) solo se puede hacer con la web ya publicada y las
  credenciales de pruebas del banco: por eso el paso 4.

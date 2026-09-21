# Puerta e incidencias con pagos

Qué hacer cuando algo no cuadra con un pago o con una entrada. Todo se resuelve desde el móvil, en el
panel: **Escanear QR** (puerta) y **Entradas** (buscar, comprobar, reenviar, anular). Cada persona entra con **su usuario**:
el perfil **Puerta** puede escanear, buscar, **comprobar un pago en Stripe** y dar entrada; anular, devolver, dar un cobro por bueno y la lista «Por revisar»
son del perfil **Administrador**. Todo lo que se hace a mano queda anotado con el nombre de quien lo hizo.

## 1. En la puerta: la entrada sale en rojo

La pantalla roja dice el **motivo** y enseña nombre, teléfono, importe, número de pedido y los avisos de Stripe de ese pedido.

| Motivo en pantalla | Qué significa | Qué hacer |
|---|---|---|
| **Ya se usó esta entrada** | Ya entró alguien con ella (sale la hora). Puede ser una captura compartida. | **No dejar pasar.** |
| **Pago pendiente** o **Reserva caducada: no llegó el pago** | La web no recibió la confirmación. Puede que el cliente **sí haya pagado** y el aviso se perdiera. | Pulsa **«Comprobar el pago en Stripe»**: se le pregunta a Stripe y, si está cobrado, **entra al momento**. Si dice que no ha pagado, no le dejes pasar hasta que pague. |
| **Pago cancelado o rechazado** | El cliente canceló o el pago no se completó: no se ha cobrado nada. | Que pague de nuevo o en taquilla. |
| **Entrada devuelta / anulada por el club** | Se devolvió el dinero o se anuló a mano. | No dejar pasar. |
| **Este QR no corresponde a ninguna entrada** | No es una entrada de la web. | Buscar por nombre (siguiente punto). |

Si **no se puede comprobar en Stripe** (sin cobertura, Stripe no responde), queda el método antiguo: pídele que te enseñe en la app de su banco el
**cargo de ese importe a COYOTE CLUB** de esos días y pulsa **«Le he visto el cargo → dar entrada»**.

**El QR no se lee o el cliente no lo encuentra:** pulsa **«Buscar por nombre»** (arriba en el escáner), escribe su
nombre, teléfono o número de pedido y pulsa **«Dar entrada ahora»** en su ficha. También puedes **enviarle la entrada por WhatsApp**.

Todo lo que des a mano queda **anotado** (hora, motivo y tu usuario). No se puede dar entrada a una entrada **devuelta o anulada** y aparece en «Por revisar» para comprobarlo después.

## 2. Al día siguiente: «Por revisar»

En **Entradas** (el menú muestra un número rojo si hay algo). Lo normal es que casi nunca haya nada: las reservas que Stripe confirma como caducadas **no** aparecen.

- **Reserva caducada sin confirmación** (el aviso de Stripe se perdió) → **«Comprobar el cobro en Stripe»**: si estaba cobrada se activa; si no, pulsa **«No cobró: dejar anulada»**.
- **Dada a mano en la puerta** → busca el pedido en Stripe: si aparece cobrado, **«Comprobado»**. Si no, esa persona entró sin pagar: hay que hablar con ella.
- **Importe distinto / pedido desconocido / pago tardío sin plazas** → revisar el cobro en el panel de Stripe y pulsar **«Ya revisado»**.
- **Devolución parcial** → la entrada sigue válida; comprueba que era lo que querías.
- **Disputa** (el cliente reclama el cargo a su banco) → responde desde el panel de Stripe (tiene plazo).

## 3. Un cliente pagó y no tiene su entrada

1. **Entradas** → buscar por nombre, teléfono o pedido.
2. Si está **Válida**: **«Enviar por WhatsApp»** (le llega el enlace con su QR).
3. Si está **Pendiente** o **Anulada · caducó sin pago**: pulsa **«Comprobar el cobro en Stripe»**. Si estaba cobrada, se activa y ya puedes enviársela.

## 4. Devoluciones

1. En el panel de Stripe → **Pagos** → el pago (en **Entradas**, la ficha tiene el enlace **«Abrir en Stripe»**) → **Reembolsar** (importe completo).
2. **Nada más:** Stripe avisa a la web y la entrada pasa sola a «Devuelta» (deja de valer y su plaza queda libre en esa noche).
   Si por lo que sea no se anulara sola, en su ficha: **Anular… → «Anular (devuelta en Stripe)»**.

Una entrada que **ya ha entrado** no se puede anular (la devolución se avisa en «Por revisar»).

## 5. Por qué puede pasar y qué protege la web

Puede que el cliente pague y la web no reciba el aviso de Stripe (web caída justo entonces, dirección del aviso mal configurada…). Para eso:

- Al **volver** de la página de pago, la web **pregunta a Stripe** si está cobrado y activa la entrada al momento, sin esperar al aviso.
- Stripe **reintenta** los avisos durante días: si llega tarde, la entrada se activa (y si la noche estaba completa se respeta el cobro y **Ventas avisa** de que se pasó el aforo).
- La web guarda **todos los avisos** de Stripe (estado, importe, referencia; nunca el número de tarjeta, que no ve).
- Una reserva que Stripe no confirma ni como cobrada ni como caducada se anula a los 40 minutos y **queda «por revisar»**.
- Al cliente **nunca se le dice que no se ha cobrado** cuando no lo sabemos: se le da un WhatsApp con su número de pedido.
- En **Ventas** figura la hora del **último aviso recibido de Stripe**. Si hay ventas y llevas días sin ver avisos nuevos, algo
  falla en la configuración del aviso (webhook): avisa.

## Aforo

Cada noche tiene un **máximo de entradas** que se venden (por defecto 264, el aforo completo del local), que se cambia en
**Eventos → Editar**. Cada entrada cuenta 1, sea del tramo que sea. En **Ventas** aparece cuántas se han vendido y cuántas quedan.
Si un pago llega tarde o se da entrada a mano con la noche completa, la entrada se respeta pero Ventas avisa de que se ha
pasado el aforo. La web no controla lo que se venda en taquilla.

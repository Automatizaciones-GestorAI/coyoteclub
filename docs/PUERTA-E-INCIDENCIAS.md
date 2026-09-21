# Puerta e incidencias con pagos

Qué hacer cuando algo no cuadra con un pago o con una entrada. Todo se resuelve desde el móvil, en el
panel: **Escanear QR** (puerta) y **Entradas** (buscar, comprobar, reenviar, anular). Cada persona entra con **su usuario**:
el perfil **Puerta** puede escanear, buscar y dar entrada; anular, devolver, dar un cobro por bueno y la lista «Por revisar»
son del perfil **Administrador**. Todo lo que se hace a mano queda anotado con el nombre de quien lo hizo.

## 1. En la puerta: la entrada sale en rojo

La pantalla roja dice el **motivo** y enseña nombre, teléfono, importe, número de pedido y si el banco avisó del pago.

| Motivo en pantalla | Qué significa | Qué hacer |
|---|---|---|
| **Ya se usó esta entrada** | Ya entró alguien con ella (sale la hora). Puede ser una captura compartida. | **No dejar pasar.** |
| **Pago pendiente** o **Reserva caducada: no llegó el pago** | La web no recibió del banco la confirmación. Puede que el cliente **sí haya pagado** y el aviso se perdiera. | Pídele que te enseñe en la app de su banco el **cargo de ese importe a COYOTE CLUB** de esos días. Si lo ves: **«Le he visto el cargo → dar entrada»**. |
| **Pago rechazado por el banco** | El banco no autorizó el pago: no se ha cobrado nada. | Que pague de nuevo o en taquilla. |
| **Entrada devuelta / anulada por el club** | Se devolvió el dinero o se anuló a mano. | No dejar pasar. |
| **Este QR no corresponde a ninguna entrada** | No es una entrada de la web. | Buscar por nombre (siguiente punto). |

**El QR no se lee o el cliente no lo encuentra:** pulsa **«Buscar por nombre»** (arriba en el escáner), escribe su
nombre, teléfono o número de pedido y pulsa **«Dar entrada ahora»** en su ficha. También puedes **enviarle la entrada por WhatsApp**.

Todo lo que des a mano queda **anotado** (hora, motivo y tu usuario). No se puede dar entrada a una entrada **devuelta o anulada** y aparece en «Por revisar» para comprobarlo después.

## 2. Al día siguiente: «Por revisar»

En **Entradas** (el menú muestra un número rojo si hay algo). Cada elemento indica el **número de pedido**. Búscalo en el
módulo de administración de Redsys («Consulta de operaciones») y contesta:

- **Reserva caducada sin confirmación** → si Redsys **sí cobró**: **«Sí cobró: dar entrada»**. Si **no**: **«No cobró: dejar anulada»**.
- **Dada a mano en la puerta** → si el pedido aparece cobrado: **«Comprobado»**. Si no aparece, esa persona entró sin pagar: hay que hablar con ella.
- **Importe distinto / pedido desconocido / pago tardío sin plazas** → revisar el cobro en Redsys y pulsar **«Ya revisado»**.

## 3. Un cliente pagó y no tiene su entrada

1. **Entradas** → buscar por nombre, teléfono o pedido.
2. Si está **Válida**: **«Enviar por WhatsApp»** (le llega el enlace con su QR).
3. Si está **Pendiente** o **Anulada · caducó sin pago**: mira el pedido en Redsys; si cobró, **«Sí cobró: dar entrada válida»** y envíasela.

## 4. Devoluciones

Hay que hacer **las dos cosas**, o el cliente podría entrar con la entrada de un dinero ya devuelto:

1. **Devolver el dinero** en el módulo de administración de Redsys (la web no mueve dinero).
2. En **Entradas**, en su ficha: **Anular… → «Anular (devuelta en Redsys)»**. La entrada deja de valer y su plaza queda libre en esa noche.

Una entrada que **ya ha entrado** no se puede anular.

## 5. Por qué puede pasar y qué protege la web

Puede que el cliente pague y la web no reciba el aviso del banco (web caída justo entonces, dirección mal configurada,
aviso no activado en el banco…). Para eso:

- La web guarda **todos los avisos** del banco (código, importe, autorización; nunca el número de tarjeta).
- Si el aviso llega tarde, **se respeta el cobro** y la entrada se activa.
- Una reserva sin pagar se anula a los 20 minutos y devuelve su plaza, pero **queda marcada «por revisar»** para que nadie pierda un cobro.
- Al cliente **nunca se le dice que no se ha cobrado** cuando no lo sabemos: se le da un WhatsApp con su número de pedido.
- En **Ventas** figura la hora del **último aviso recibido del banco**. Si hay ventas y llevas días sin ver avisos nuevos, algo
  falla en la configuración de las notificaciones: avisa.

## Aforo

Cada noche tiene su **aforo** (personas), que se cambia en **Eventos → Editar** (por defecto 264, el aforo completo del local).
En **Ventas** aparece cuántas plazas quedan de esa noche. Las entradas que se vendan en taquilla salen de ese mismo aforo,
así que antes de vender en puerta mira las plazas libres. Si un pago llega tarde o se da entrada a mano con la noche completa,
la entrada se respeta pero Ventas avisa de que se ha pasado el aforo.

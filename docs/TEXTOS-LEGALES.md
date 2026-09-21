# Textos legales, cookies y logos de pago

La web ya incluye las páginas que los bancos (Redsys) y la ley piden a una tienda de entradas:

| Página | Qué es |
|---|---|
| `/aviso-legal` | Datos del titular (art. 10 LSSI-CE), uso del sitio, propiedad intelectual, reclamaciones |
| `/privacidad` | Política de privacidad (RGPD / LOPDGDD): datos, finalidades, proveedores, derechos |
| `/condiciones` | Condiciones de compra: pago, entrada, acceso, **sin desistimiento (art. 103.l TRLGDCU)**, devoluciones |
| `/cookies` | Política de cookies (la web pública no instala ninguna) |

Además: casilla obligatoria de aceptación al comprar (se guarda fecha y versión con cada entrada), «Precios con IVA
incluido», logos Visa/Mastercard, enlaces legales en el pie, en `/entradas` y en la página de la entrada.

## Qué datos hay que pedirle al cliente (titular del negocio)

Se rellenan en **`src/lib/legal.ts`** (los huecos salen en las páginas como «[COMPLETAR: …]» y el panel, en **Ventas**,
avisa de lo que falta):

1. **Nombre y apellidos o razón social** de quien vende (el que da de alta el TPV en el banco).
2. **NIF / CIF.**
3. **Domicilio** fiscal completo.
4. **Email** de contacto (también sirve para ejercer los derechos de protección de datos).
5. Solo si es una **sociedad**: datos del Registro Mercantil (`holderRegistry`).
6. Confirmar tres decisiones del negocio (hoy hay valores por defecto): **edad mínima** (`minAge`, 18), **plazo para devolver
   el importe si se cancela un evento** (`refundDays`, 14 días) y la **política de devoluciones** de `/condiciones`
   (solo si se cancela o cambia el evento, o hay un cobro duplicado).
7. Cuando el titular o su gestor hayan revisado los textos: `holderConfirmed: true`.

Si cambia cualquier texto o dato importante, sube la fecha de `version` (formato `AAAA-MM-DD`): se guarda con cada compra.

## Qué debe revisar un gestor o abogado

Los textos son una plantilla completa y adaptada a cómo funciona esta web, pero **no sustituyen la revisión de un profesional**.
Conviene que revise sobre todo: el plazo de conservación de datos, las condiciones de devolución, la referencia a las hojas de
reclamaciones y al derecho de admisión (normativa de Castilla-La Mancha) y que el titular esté dado de alta para la venta de entradas.

## Cookies: por qué no hay banner

- La web pública **no pone cookies ni usa almacenamiento local** (comprobado). Solo el panel del personal usa una cookie técnica de sesión.
- Las **fuentes** se sirven desde la propia web (`/public/fonts`), no desde Google.
- El **mapa** de Google no se carga hasta que el visitante pulsa «Ver mapa».
- Si algún día se añade analítica, publicidad o vídeos incrustados, **hará falta banner de consentimiento** y actualizar `/cookies`.

## Logos de pago

Están en `public/pagos/visa.svg` y `public/pagos/mastercard.svg` (iconos de uso libre, en color claro para el fondo oscuro).
Si el banco entrega su kit de logos oficiales, basta con **sustituir esos archivos manteniendo el nombre**. El logo de Redsys
lo facilita el banco: se puede añadir en `src/lib/legal-ui.ts`.

## Pendiente conocido

- **Borrado de datos:** la política dice que los datos se suprimen cuando pasan los plazos legales. Hoy no hay un proceso
  automático de borrado; habría que hacerlo a mano o añadirlo más adelante.
- Si se empieza a pedir el **email** en la compra o a enviar **comunicaciones comerciales**, hay que actualizar la política y
  pedir consentimiento aparte.

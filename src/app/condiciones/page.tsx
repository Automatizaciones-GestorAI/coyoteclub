import { LEGAL } from '@/lib/legal';
import { F } from '../_legal/Bits';
import { LegalLayout } from '../_legal/LegalLayout';

export const metadata = { title: 'Condiciones de compra · Coyote Club' };

export default function Condiciones() {
  return (
    <LegalLayout
      title="CONDICIONES DE COMPRA"
      intro={`Estas condiciones regulan la compra online de entradas para los eventos de ${LEGAL.tradeName}. Léelas antes de pagar: al marcar la casilla de aceptación y completar el pago las aceptas.`}
    >
      <h2>1. Quién vende</h2>
      <p>Las entradas las vende <F v={LEGAL.holderName} what="nombre o razón social" />, con NIF/CIF <F v={LEGAL.holderTaxId} what="NIF/CIF" /> y domicilio en <F v={LEGAL.holderAddress} what="domicilio" />, titular de {LEGAL.tradeName} ({LEGAL.venueAddress}). Contacto: <F v={LEGAL.holderEmail} what="email de contacto" /> · {LEGAL.phone}. El contrato se celebra en español.</p>

      <h2>2. Cómo se compra</h2>
      <ul>
        <li>Eliges la noche y el tipo de entrada, escribes tu nombre y tu teléfono y pulsas «Ir a pagar».</li>
        <li>Te llevamos a la página de pago segura de Stripe, donde pagas con tarjeta (Visa, Mastercard) u otros medios que aparezcan, como Apple Pay o Google Pay. Stripe te pedirá tu email para enviarte el recibo.</li>
        <li>Al reservar tu entrada tienes <strong>30 minutos</strong> para completar el pago. Pasado ese tiempo la página de pago caduca y la reserva se libera; si aún quieres la entrada, tendrás que empezar la compra de nuevo.</li>
        <li>Cuando Stripe confirma el pago, la web te muestra tu entrada con su <strong>código QR</strong>. No la enviamos por email: <strong>guarda el enlace de esa página o haz una captura de pantalla</strong>, es tu justificante. Si la pierdes, escríbenos por WhatsApp con tu nombre, tu teléfono y la noche y te la volvemos a enviar.</li>
      </ul>

      <h2>3. Precios y pago</h2>
      <p>Los precios están en euros e <strong>incluyen el IVA</strong>. Hay varios tramos de precio con plazas limitadas: el precio que ves al comprar es el que pagas, y puede subir para las compras posteriores o al agotarse las plazas de un tramo. No hay gastos adicionales. El cargo se hace en el momento del pago.</p>

      <h2>4. Tu entrada y el acceso al local</h2>
      <ul>
        <li>La entrada da derecho a acceder a la noche indicada, en el horario del evento y hasta completar el aforo permitido.</li>
        <li>El código QR es de un solo uso: la primera lectura da acceso y las siguientes se rechazan. <strong>No lo compartas ni lo publiques</strong>: quien lo presente primero entra.</li>
        <li>El acceso está reservado a <strong>mayores de {LEGAL.minAge} años</strong>. Podemos pedirte un documento oficial que lo acredite.</li>
        <li>{LEGAL.tradeName} se reserva el derecho de admisión en los términos que permite la normativa de espectáculos públicos y actividades recreativas, con las condiciones expuestas a la entrada del local. No se ejercerá de forma arbitraria ni discriminatoria. La denegación del acceso por incumplir los requisitos de edad o las normas del local no da derecho a devolución.</li>
      </ul>

      <h2>5. Devoluciones y desistimiento</h2>
      <p className="legal-note"><strong>Importante:</strong> conforme al artículo 103.l) del Real Decreto Legislativo 1/2007 (Ley General para la Defensa de los Consumidores y Usuarios), <strong>no existe derecho de desistimiento</strong> en los servicios de ocio y esparcimiento que se prestan en una fecha determinada. Por eso <strong>las entradas no admiten devolución ni cambio</strong>, salvo en los casos siguientes.</p>
      <ul>
        <li><strong>Si {LEGAL.tradeName} cancela el evento</strong>, te devolvemos el importe íntegro de tu entrada al mismo medio de pago, en un máximo de {LEGAL.refundDays} días desde tu solicitud.</li>
        <li><strong>Si el evento cambia de fecha</strong>, tu entrada vale para la nueva fecha; si no puedes asistir, puedes pedir la devolución en el plazo que indiquemos al anunciar el cambio.</li>
        <li><strong>Si te han cobrado dos veces o por error</strong>, te devolvemos el cobro indebido.</li>
      </ul>
      <p>Los cambios de artista, de DJ o de cartel no dan derecho a devolución si el evento se celebra.</p>
      <p>Para pedir una devolución, escríbenos a <F v={LEGAL.holderEmail} what="email de contacto" /> o por WhatsApp al {LEGAL.phone} indicando tu nombre, tu teléfono y el número de pedido.</p>

      <h2>6. Si pagas y no te aparece la entrada</h2>
      <p>Si te han cobrado y no ves tu entrada con el QR (por ejemplo, porque se cortó la conexión), <strong>no vuelvas a pagar</strong>. Escríbenos por WhatsApp al {LEGAL.phone} con tu nombre, tu teléfono y la noche (y el recibo que te envía Stripe, si lo tienes). Comprobamos el cobro directamente en Stripe y, si es correcto, te damos tu entrada o te devolvemos el dinero. En la puerta también podemos comprobar tu pago al momento.</p>

      <h2>7. Responsabilidad y normas del local</h2>
      <p>Debes respetar las normas del local y las indicaciones del personal. No nos hacemos responsables de la pérdida o el robo de la entrada ni de su uso por terceros a quienes se la hayas facilitado. Ninguna de las partes responde del incumplimiento causado por fuerza mayor o por circunstancias fuera de su control.</p>

      <h2>8. Atención al cliente y reclamaciones</h2>
      <p>Puedes contactarnos en <F v={LEGAL.holderEmail} what="email de contacto" /> o por WhatsApp al {LEGAL.phone}. Hay hojas de reclamaciones oficiales a disposición de los clientes en el local.</p>

      <h2>9. Datos personales</h2>
      <p>Tratamos tus datos para gestionar la compra tal y como explica la <a href="/privacidad">Política de privacidad</a>.</p>

      <h2>10. Legislación aplicable</h2>
      <p>Estas condiciones se rigen por la legislación española. Si eres consumidor, podrás acudir a los juzgados y tribunales que la normativa de consumidores establezca.</p>
    </LegalLayout>
  );
}

import { LEGAL } from '@/lib/legal';
import { F } from '../_legal/Bits';
import { LegalLayout } from '../_legal/LegalLayout';

export const metadata = { title: 'Política de privacidad · Coyote Club' };

export default function Privacidad() {
  return (
    <LegalLayout
      title="POLÍTICA DE PRIVACIDAD"
      intro="Aquí te explicamos, de forma sencilla, qué datos personales tratamos cuando compras una entrada o usas esta web, para qué los usamos y qué derechos tienes (Reglamento (UE) 2016/679, RGPD, y Ley Orgánica 3/2018, LOPDGDD)."
    >
      <h2>1. Responsable del tratamiento</h2>
      <dl className="legal-data">
        <dt>Responsable</dt><dd><F v={LEGAL.holderName} what="nombre o razón social" /> ({LEGAL.tradeName})</dd>
        <dt>NIF / CIF</dt><dd><F v={LEGAL.holderTaxId} what="NIF/CIF" /></dd>
        <dt>Domicilio</dt><dd><F v={LEGAL.holderAddress} what="domicilio" /></dd>
        <dt>Email</dt><dd><F v={LEGAL.holderEmail} what="email de contacto" /></dd>
      </dl>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li><strong>Al comprar una entrada:</strong> tu nombre, tu teléfono y tu email (este último se te pide en la página de pago de Stripe, para enviarte el recibo); la noche y el tipo de entrada; el importe, el número de pedido, el estado del pago y su fecha.</li>
        <li><strong>Del pago:</strong> no recibimos ni guardamos el número de tu tarjeta ni los datos de tu medio de pago. El pago se hace en la página segura de Stripe. A nosotros solo nos llega el resultado (pagado o no), el importe, la referencia del cobro y tu email.</li>
        <li><strong>En la puerta:</strong> el momento en que se lee el código QR de tu entrada.</li>
        <li><strong>Datos técnicos:</strong> tu dirección IP y datos básicos del navegador, que quedan en los registros del servidor y se usan para la seguridad y para limitar intentos abusivos.</li>
        <li><strong>Si nos escribes</strong> por WhatsApp o por teléfono, los datos que nos facilites.</li>
      </ul>

      <h2>3. Para qué los usamos y con qué base legal</h2>
      <ul>
        <li><strong>Gestionar tu compra y emitir tu entrada</strong>, incluido el control de acceso con el QR: es necesario para cumplir el contrato contigo (art. 6.1.b RGPD).</li>
        <li><strong>Atender consultas, incidencias con el pago y devoluciones:</strong> ejecución del contrato e interés legítimo en atender a nuestros clientes (art. 6.1.b y 6.1.f).</li>
        <li><strong>Seguridad de la web y prevención del fraude y de abusos</strong> (por ejemplo, reservas masivas automatizadas): interés legítimo (art. 6.1.f).</li>
        <li><strong>Cumplir obligaciones legales</strong>, como las contables y fiscales o los requerimientos de las autoridades (art. 6.1.c).</li>
      </ul>
      <p>Facilitar nombre y teléfono es necesario para comprar: sin ellos no podemos emitir la entrada. <strong>No usamos tus datos para enviarte publicidad, no elaboramos perfiles y no tomamos decisiones automatizadas.</strong> Si algún día quisiéramos enviarte comunicaciones comerciales, te lo pediríamos aparte y podrías negarte.</p>

      <h2>4. Cuánto tiempo los conservamos</h2>
      <p>Mientras sean necesarios para gestionar tu compra y atender posibles reclamaciones. Después, los mantenemos bloqueados durante los plazos de prescripción legales y, en lo que se refiere a la documentación contable y fiscal, durante el tiempo que exige la ley (con carácter general, hasta 6 años). Pasados esos plazos se suprimen.</p>

      <h2>5. A quién comunicamos tus datos</h2>
      <p>No vendemos ni cedemos tus datos. Solo los conocen los proveedores que necesitamos para prestar el servicio, con contrato de encargo de tratamiento:</p>
      <ul>
        <li><strong>Supabase</strong>, que aloja la base de datos (servidores en la Unión Europea, Irlanda).</li>
        <li><strong>{LEGAL.hostingProvider}</strong>, que aloja el servidor de la web (París, Unión Europea).</li>
        <li><strong>Stripe</strong> (Stripe Payments Europe, Ltd., Irlanda, y su grupo), que procesa el pago y es responsable de los datos de tu tarjeta y de la prevención del fraude según su propia política (<a href="https://stripe.com/es/privacy" target="_blank" rel="noopener">stripe.com/es/privacy</a>).</li>
      </ul>
      <p>También pueden conocerlos las Administraciones Públicas, los jueces y las Fuerzas y Cuerpos de Seguridad cuando la ley lo exija. Dentro de {LEGAL.tradeName}, solo accede a los datos el personal que los necesita para su función (administración y puerta).</p>

      <h2>6. Transferencias internacionales</h2>
      <p>Nuestros servidores están en la Unión Europea. Algunos proveedores (por ejemplo, Supabase Inc. y Stripe, Inc.) tienen su matriz en Estados Unidos; en ese caso, el acceso a los datos se ampara en las garantías previstas por el RGPD (cláusulas contractuales tipo o el Marco de Privacidad de Datos UE-EE. UU.). Si pulsas «Ver mapa» en la web, tu navegador se conecta con Google (más información en la <a href="/cookies">Política de cookies</a>).</p>

      <h2>7. Tus derechos</h2>
      <p>Puedes solicitar el <strong>acceso</strong> a tus datos, su <strong>rectificación</strong> o <strong>supresión</strong>, la <strong>limitación</strong> del tratamiento, la <strong>portabilidad</strong> y <strong>oponerte</strong> al tratamiento basado en interés legítimo. Escríbenos a <F v={LEGAL.holderEmail} what="email de contacto" /> indicando tu nombre, tu teléfono y, si lo tienes, el número de pedido, y adjuntando un documento que acredite tu identidad. Responderemos en un plazo máximo de un mes.</p>
      <p>Si consideras que no hemos tratado tus datos correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).</p>

      <h2>8. Seguridad</h2>
      <p>Aplicamos medidas técnicas y organizativas razonables: comunicaciones cifradas (HTTPS), base de datos accesible solo desde el servidor de la web, accesos del personal con usuario y contraseña propios y con permisos según su función, y registro de las acciones manuales sobre las entradas.</p>

      <h2>9. Menores de edad</h2>
      <p>La compra de entradas y el acceso al local están reservados a mayores de {LEGAL.minAge} años. Si detectamos datos de un menor obtenidos sin autorización, los eliminaremos.</p>

      <h2>10. Cambios en esta política</h2>
      <p>Podemos actualizar esta política si cambian la ley o la forma en que funciona la web. La fecha de la última actualización figura al principio de la página.</p>
    </LegalLayout>
  );
}

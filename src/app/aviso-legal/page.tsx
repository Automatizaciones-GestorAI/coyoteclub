import { LEGAL } from '@/lib/legal';
import { F } from '../_legal/Bits';
import { LegalLayout } from '../_legal/LegalLayout';

export const metadata = { title: 'Aviso legal · Coyote Club' };

export default function AvisoLegal() {
  return (
    <LegalLayout title="AVISO LEGAL">
      <h2>1. Titular del sitio web</h2>
      <p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:</p>
      <dl className="legal-data">
        <dt>Nombre comercial</dt><dd>{LEGAL.tradeName}</dd>
        <dt>Titular</dt><dd><F v={LEGAL.holderName} what="nombre o razón social" /></dd>
        <dt>NIF / CIF</dt><dd><F v={LEGAL.holderTaxId} what="NIF/CIF" /></dd>
        <dt>Domicilio</dt><dd><F v={LEGAL.holderAddress} what="domicilio" /></dd>
        <dt>Email</dt><dd><F v={LEGAL.holderEmail} what="email de contacto" /></dd>
        <dt>Teléfono / WhatsApp</dt><dd>{LEGAL.phone}</dd>
        {LEGAL.holderRegistry.trim() && (<><dt>Registro Mercantil</dt><dd>{LEGAL.holderRegistry}</dd></>)}
        <dt>Local</dt><dd>{LEGAL.venueAddress}</dd>
      </dl>

      <h2>2. Objeto y aceptación</h2>
      <p>Este sitio web ofrece información sobre {LEGAL.tradeName}, su programación y horarios, y permite comprar entradas online. Navegar por él implica aceptar este aviso legal. La compra de entradas se rige, además, por las <a href="/condiciones">Condiciones de compra</a>.</p>

      <h2>3. Uso del sitio</h2>
      <p>Te comprometes a usar la web de buena fe y conforme a la ley. En particular, no está permitido intentar acceder a las zonas reservadas al personal, alterar el funcionamiento del sitio, reservar entradas de forma automatizada o abusiva, ni utilizarlo con fines fraudulentos.</p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>El nombre, el logotipo, las fotografías, los vídeos, el diseño y los textos del sitio pertenecen a {LEGAL.tradeName} o se usan con autorización de sus titulares (incluidos los carteles de los artistas y DJ, que pertenecen a sus autores). No se pueden copiar, distribuir ni modificar sin permiso previo y por escrito, salvo para uso personal.</p>

      <h2>5. Enlaces y responsabilidad</h2>
      <p>Hacemos lo posible por que la información sea exacta y esté actualizada, pero la programación (fechas, artistas, horarios) puede cambiar. La web puede tener interrupciones puntuales por mantenimiento o por causas ajenas a nosotros.</p>
      <p>El sitio incluye enlaces a servicios de terceros (Instagram, WhatsApp, Google Maps). No controlamos sus contenidos ni sus políticas de privacidad y no respondemos de ellos.</p>

      <h2>6. Protección de datos y cookies</h2>
      <p>El tratamiento de tus datos personales se explica en la <a href="/privacidad">Política de privacidad</a> y el uso de cookies en la <a href="/cookies">Política de cookies</a>.</p>

      <h2>7. Reclamaciones</h2>
      <p>Hay hojas de reclamaciones oficiales a disposición de los clientes en el local. También puedes escribirnos a <F v={LEGAL.holderEmail} what="email de contacto" /> o por WhatsApp al {LEGAL.phone} y trataremos de resolver tu incidencia lo antes posible.</p>

      <h2>8. Legislación aplicable y jurisdicción</h2>
      <p>Este aviso se rige por la legislación española. Si eres consumidor, para cualquier controversia serán competentes los juzgados y tribunales que la normativa de consumidores establezca; en los demás casos, los de la localidad del domicilio del titular, con renuncia a cualquier otro fuero.</p>
    </LegalLayout>
  );
}

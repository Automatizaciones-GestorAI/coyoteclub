import { LEGAL } from '@/lib/legal';
import { LegalLayout } from '../_legal/LegalLayout';

export const metadata = { title: 'Política de cookies · Coyote Club' };

export default function Cookies() {
  return (
    <LegalLayout
      title="POLÍTICA DE COOKIES"
      intro="Las cookies son pequeños archivos que un sitio web guarda en tu navegador. Esta es la información sobre las que usa esta web (artículo 22.2 de la LSSI-CE)."
    >
      <h2>Resumen</h2>
      <p className="legal-note"><strong>Esta web no instala ninguna cookie en tu navegador cuando la visitas como cliente.</strong> No usamos cookies de publicidad, de analítica ni de seguimiento, y por eso no te mostramos un aviso de cookies. Las fuentes de letra están alojadas en nuestro propio servidor, no en Google.</p>

      <h2>Cookies propias</h2>
      <ul>
        <li><strong>coyote_admin_session</strong> — cookie técnica y necesaria, solo para el <strong>personal</strong> de {LEGAL.tradeName} que entra en el panel o en el escáner de entradas. Mantiene la sesión iniciada (30 días como máximo) y no se usa para ningún otro fin. Los clientes no la reciben. Al ser estrictamente necesaria, no requiere consentimiento.</li>
      </ul>

      <h2>Servicios de terceros</h2>
      <ul>
        <li><strong>Google Maps.</strong> El mapa de «Cómo llegar» se ve como una <strong>imagen alojada en esta web</strong> (datos de © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>). El mapa interactivo de Google <strong>no se carga hasta que pulsas «Ver mapa interactivo»</strong>: en ese momento tu navegador se conecta con Google, que puede instalar sus propias cookies e identificarte según su política (<a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener">policies.google.com</a>). Si no pulsas el botón, no se envía nada a Google. También puedes abrir la ubicación en la aplicación de Google Maps con el botón «Abrir en Google Maps».</li>
        <li><strong>Stripe (pago).</strong> Al pagar, te llevamos a la página segura de Stripe, que puede usar sus propias cookies técnicas y de prevención del fraude para procesar el pago. Se rigen por la política de cookies de Stripe (<a href="https://stripe.com/es/legal/cookies-policy" target="_blank" rel="noopener">stripe.com/es/legal/cookies-policy</a>).</li>
        <li><strong>Instagram y WhatsApp.</strong> Solo hay enlaces: no cargamos nada de ellos hasta que tú los pulsas.</li>
      </ul>

      <h2>Cómo borrar o bloquear cookies</h2>
      <p>Puedes eliminar o bloquear las cookies desde los ajustes de tu navegador (Chrome, Safari, Firefox, Edge…). Ten en cuenta que, si bloqueas las técnicas, el personal no podría iniciar sesión en el panel.</p>

      <h2>Cambios</h2>
      <p>Si en el futuro añadiéramos cookies no necesarias (por ejemplo, de analítica), actualizaríamos esta política y te pediríamos tu consentimiento antes de instalarlas.</p>
    </LegalLayout>
  );
}

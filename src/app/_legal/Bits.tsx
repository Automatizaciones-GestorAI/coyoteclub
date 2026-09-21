import { LEGAL } from '@/lib/legal';
import { legalLinksHtml, paymentLogosHtml } from '@/lib/legal-ui';

// Dato del titular: si aún está vacío se ve un aviso «[COMPLETAR: …]» para que no pase desapercibido.
export function F({ v, what }: { v: string; what: string }) {
  return v && v.trim() ? <>{v}</> : <span className="legal-todo">[COMPLETAR: {what}]</span>;
}

export function LegalLinks() {
  return <div dangerouslySetInnerHTML={{ __html: legalLinksHtml() }} />;
}

export function PaymentLogos() {
  return <span dangerouslySetInnerHTML={{ __html: paymentLogosHtml() }} />;
}

export function LegalDate() {
  return <>{new Date(LEGAL.version + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</>;
}

// Trozos de HTML compartidos (enlaces legales y logos de pago) para páginas hechas con cadenas de HTML (inicio)
// y para componentes de React. No llevan datos del usuario.

export const LEGAL_LINKS: [string, string][] = [
  ['/aviso-legal', 'Aviso legal'],
  ['/privacidad', 'Privacidad'],
  ['/condiciones', 'Condiciones de compra'],
  ['/cookies', 'Cookies']
];

export const legalLinksHtml = () =>
  `<nav class="legal-links" aria-label="Información legal">${LEGAL_LINKS.map(([href, text]) => `<a href="${href}">${text}</a>`).join('')}</nav>`;

// Los archivos están en /public/pagos: para usar otros logos basta con sustituirlos (mismo nombre).
export const paymentLogosHtml = () =>
  '<span class="pay-logos" role="img" aria-label="Se acepta el pago con tarjetas Visa y Mastercard">' +
  '<span class="pay-logo"><img src="/pagos/visa.svg" alt="" height="15"></span>' +
  '<span class="pay-logo"><img class="mc" src="/pagos/mastercard.svg" alt="" height="22"></span>' +
  '</span>';

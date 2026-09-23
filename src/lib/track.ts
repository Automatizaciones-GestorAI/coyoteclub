// Seguimiento propio de la web (ver /api/track y /cookies): sin cookies, no identifica a nadie, solo cuenta.
// Si falla, no debe notarse nada para quien navega — de ahí el try/catch y el sendBeacon (no bloquea la página).
export function track(kind: 'pageview', path: string): void;
export function track(kind: 'click', label: string): void;
export function track(kind: 'pageview' | 'click', value: string): void {
  try {
    const body = JSON.stringify(kind === 'pageview' ? { kind, path: value } : { kind, label: value });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* nunca debe romper la navegación */
  }
}

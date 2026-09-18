export function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const dia = dias[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${dia} · ${dd} ${meses[d.getMonth()]}`;
}

export function formatPrice(cents: number): string {
  const value = cents / 100;
  return Number.isInteger(value) ? `${value} €` : `${value.toFixed(2)} €`;
}

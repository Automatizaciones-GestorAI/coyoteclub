import { headers } from 'next/headers';

// WhatsApp del club (el mismo que sale en la web). Formato internacional sin "+".
export const CLUB_WHATSAPP = '34653533549';

// URL pública de la web. Se lee en ejecución (con el nombre en una variable para que no quede
// "congelada" en el build) y, si no está configurada, se deduce de la petición.
export async function siteBase(): Promise<string> {
  const names = ['SITE_URL', 'NEXT_PUBLIC_SITE_URL'];
  for (const n of names) {
    const v = (process.env[n] ?? '').trim().replace(/\/+$/, '');
    if (v) return v;
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : '';
}

// Teléfono del comprador -> número para wa.me (asume España si son 9 cifras).
export function phoneToWhatsapp(phone: string | null | undefined): string | null {
  let d = (phone ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (/^[6-9]\d{8}$/.test(d)) d = '34' + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export const whatsappLink = (to: string | null, text: string) =>
  `https://wa.me/${to ?? ''}?text=${encodeURIComponent(text)}`;

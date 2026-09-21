import './globals.css';
import type { Metadata, Viewport } from 'next';
import { siteBase } from '@/lib/site';

const TITLE = 'Coyote Club · Sala de fiestas en Seseña (Toledo)';
const SHARE_IMAGE = { url: '/images/share.jpg', width: 1200, height: 630, alt: 'Coyote Club, sala de fiestas en Seseña (Toledo): viernes y sábados' };
const DESCRIPTION =
  'Coyote Club, la mejor sala de la zona en Seseña (Toledo). Viernes y sábados de 00:00 a 06:00: pista, barra y cócteles. Compra tu entrada online.';

// La dirección base sale de la configuración o, si no está, de la propia petición: así las imágenes
// de la vista previa (WhatsApp, Instagram...) llevan siempre la dirección correcta, también con el dominio propio.
export async function generateMetadata(): Promise<Metadata> {
  let metadataBase: URL | undefined;
  try {
    const base = await siteBase();
    if (base) metadataBase = new URL(base);
  } catch {
    /* dirección no válida: sin base, no se rompe la página */
  }
  return {
    metadataBase,
    title: TITLE,
    description: DESCRIPTION,
    applicationName: 'Coyote Club',
    openGraph: { type: 'website', locale: 'es_ES', siteName: 'Coyote Club', title: TITLE, description: DESCRIPTION, url: '/', images: [SHARE_IMAGE] },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] }
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preload" href="/fonts/bebas-neue-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

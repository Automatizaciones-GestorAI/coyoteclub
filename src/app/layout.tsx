import './globals.css';
import type { Metadata, Viewport } from 'next';
import { SITE_URL } from '@/lib/site';

const TITLE = 'Coyote Club · Sala de fiestas en Seseña (Toledo)';
const SHARE_IMAGE = { url: '/images/share.jpg', width: 1200, height: 630, alt: 'Coyote Club, sala de fiestas en Seseña (Toledo): viernes y sábados' };
const DESCRIPTION =
  'Coyote Club, la mejor sala de la zona en Seseña (Toledo). Viernes y sábados de 00:00 a 06:00: pista, barra y cócteles. Compra tu entrada online.';

// La dirección base es siempre la definitiva (no la de la visita: por www. o por la provisional de EasyPanel
// redirigen antes de llegar aquí, ver next.config.js), así que la vista previa al compartir y el "canonical"
// que le dice a Google cuál es la página buena siempre son los mismos, entres por donde entres.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Coyote Club',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'es_ES', siteName: 'Coyote Club', title: TITLE, description: DESCRIPTION, url: '/', images: [SHARE_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] }
};

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

/** @type {import('next').NextConfig} */

// Cabeceras de seguridad para toda la web. La cámara se permite solo en el propio sitio (escáner de QR).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' }
];

// Archivos estáticos (no cambian a menudo): el navegador los guarda un día (y los sigue enseñando mientras revalida una semana).
// Las fuentes no cambian nunca con el mismo nombre: un año.
const staticCache = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }];
const fontCache = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];

// Lo que lleva datos privados (panel, API, entradas con QR) no se guarda en cachés compartidas.
const noStore = [{ key: 'Cache-Control', value: 'no-store, max-age=0' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // No se usa next/image: se desactiva el optimizador para que no sirva de proxy de imágenes ajenas.
  images: { unoptimized: true },
  // Los carteles y fotos de ejemplo están guardados en la base de datos con su dirección antigua (.png/.jpg): se sirven desde su
  // versión WebP (mucho más ligera) sin tocar los datos. Las imágenes que se suben desde el panel ya se guardan en WebP.
  async rewrites() {
    const legacy = { gallery: ['ambiente.png', 'barra.png', 'pista.png', 'fuego.jpg'], posters: ['sabado-exotica.jpg', 'viernes-juanjooy.jpg'] };
    return {
      beforeFiles: Object.entries(legacy).flatMap(([dir, files]) =>
        files.map((f) => ({ source: `/${dir}/${f}`, destination: `/${dir}/${f.replace(/\.(png|jpg)$/, '.webp')}` }))
      )
    };
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/images/:path*', headers: staticCache },
      { source: '/gallery/:path*', headers: staticCache },
      { source: '/posters/:path*', headers: staticCache },
      { source: '/pagos/:path*', headers: staticCache },
      { source: '/video/:path*', headers: staticCache },
      { source: '/fonts/:path*', headers: fontCache },
      { source: '/admin/:path*', headers: noStore },
      { source: '/api/:path*', headers: noStore },
      { source: '/scan', headers: noStore },
      { source: '/ticket/:path*', headers: noStore }
    ];
  }
};
module.exports = nextConfig;

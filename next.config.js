/** @type {import('next').NextConfig} */

// Cabeceras de seguridad para toda la web. La cámara se permite solo en el propio sitio (escáner de QR).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' }
];

// Lo que lleva datos privados (panel, API, entradas con QR) no se guarda en cachés compartidas.
const noStore = [{ key: 'Cache-Control', value: 'no-store, max-age=0' }];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // No se usa next/image: se desactiva el optimizador para que no sirva de proxy de imágenes ajenas.
  images: { unoptimized: true },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: noStore },
      { source: '/api/:path*', headers: noStore },
      { source: '/scan', headers: noStore },
      { source: '/ticket/:path*', headers: noStore }
    ];
  }
};
module.exports = nextConfig;

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// El panel, el escáner, las entradas con QR y la API no deben aparecer en Google. La dirección del mapa del
// sitio es siempre la definitiva (aunque alguien pida este archivo por www. o por la dirección provisional).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/scan', '/ticket', '/api'] }],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}

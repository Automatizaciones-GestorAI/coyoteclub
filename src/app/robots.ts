import type { MetadataRoute } from 'next';
import { siteBase } from '@/lib/site';

// El panel, el escáner, las entradas con QR y la API no deben aparecer en Google.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteBase();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/scan', '/ticket', '/api'] }],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {})
  };
}

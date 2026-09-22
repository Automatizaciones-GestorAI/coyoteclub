import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Siempre con la dirección definitiva: si Google pidiera esto por www. o por la dirección provisional,
// no debe salir un mapa del sitio que liste esas mismas direcciones (reforzaría el contenido duplicado).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  const pages: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
    ['/', 'weekly', 1],
    ['/entradas', 'weekly', 0.9],
    ['/aviso-legal', 'yearly', 0.2],
    ['/privacidad', 'yearly', 0.2],
    ['/condiciones', 'yearly', 0.2],
    ['/cookies', 'yearly', 0.2]
  ];
  return pages.map(([path, changeFrequency, priority]) => ({ url: base + path, changeFrequency, priority }));
}

import type { MetadataRoute } from 'next';
import { siteBase } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteBase();
  if (!base) return [];
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

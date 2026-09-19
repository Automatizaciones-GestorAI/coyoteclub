// Limitador de peticiones en memoria (un solo contenedor). Se reinicia al reiniciar la web,
// que para frenar ataques de fuerza bruta y abusos de la compra es suficiente.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// IP del cliente tal como la ve el proxy de EasyPanel (Traefik). Se usa la ÚLTIMA entrada de
// X-Forwarded-For: es la que añade el proxy de confianza; las anteriores las puede inventar el cliente.
export function clientIp(req: Request): string {
  const h = req.headers;
  return h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',').pop()?.trim() || 'desconocida';
}

function live(key: string): Bucket | undefined {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  const b = buckets.get(key);
  return b && b.resetAt >= now ? b : undefined;
}

// Segundos que hay que esperar si ya se ha llegado al límite; 0 si se puede continuar.
export function retryAfter(key: string, limit: number): number {
  const b = live(key);
  return b && b.count >= limit ? Math.max(1, Math.ceil((b.resetAt - Date.now()) / 1000)) : 0;
}

export function addHit(key: string, windowMs: number): void {
  const b = live(key);
  if (b) b.count++;
  else buckets.set(key, { count: 1, resetAt: Date.now() + windowMs });
}

export function clearHits(key: string): void {
  buckets.delete(key);
}

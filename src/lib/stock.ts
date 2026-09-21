// Aforo por noche. Lo ocupado (entradas pendientes de pago + pagadas + usadas) lo cuenta la base de datos
// (función night_usage); aquí solo se calcula lo que queda y cómo se enseña.

// Umbral a partir del cual la web avisa "Quedan pocas" (nunca se enseña el número).
export const LOW_STOCK = 20;

export type Availability = 'ok' | 'low' | 'soldout';

// Ocupación: por noche y por (noche, tramo). La clave de una noche es su id ('none' si no hay noches).
export type Usage = { night: Record<string, number>; tier: Record<string, number> };
export const NO_NIGHT = 'none';
export const emptyUsage = (): Usage => ({ night: {}, tier: {} });

export type NightInfo = { id: string | null; capacity: number | null };
type TierInfo = { id: string; kind?: string; night_limit?: number | null; event_id?: string | null };

// Hasta el mediodía siguiente sigue contando la noche que acaba de pasar (la gente entra de madrugada).
export const upcomingCutoff = () => new Date(Date.now() - 12 * 3600 * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
export const isUpcoming = (eventDate: string) => eventDate >= upcomingCutoff();

// Plazas que quedan de un tramo en una noche: la menor entre lo que queda del tramo y lo que queda de aforo.
// null = sin límite. La taquilla (kind 'door') no se vende por la web y nunca lleva límite.
export function slotsLeft(tier: TierInfo, night: NightInfo, usage: Usage): number | null {
  if (tier.kind === 'door') return null;
  const key = night.id ?? NO_NIGHT;
  const lefts: number[] = [];
  if (night.capacity !== null && night.capacity !== undefined) lefts.push(night.capacity - (usage.night[key] ?? 0));
  if (tier.night_limit !== null && tier.night_limit !== undefined) lefts.push(tier.night_limit - (usage.tier[`${key}|${tier.id}`] ?? 0));
  return lefts.length ? Math.max(0, Math.min(...lefts)) : null;
}

export function availabilityOf(left: number | null): Availability {
  if (left === null) return 'ok';
  if (left <= 0) return 'soldout';
  return left <= LOW_STOCK ? 'low' : 'ok';
}

export const tierAvailability = (tier: TierInfo, night: NightInfo, usage: Usage): Availability => availabilityOf(slotsLeft(tier, night, usage));

const RANK: Record<Availability, number> = { soldout: 0, low: 1, ok: 2 };
// Estado de un tramo en general = el mejor de sus noches (si alguna noche tiene sitio, se puede comprar).
export function bestAvailability(list: Availability[]): Availability {
  if (list.length === 0) return 'soldout';
  return list.reduce((a, b) => (RANK[a] >= RANK[b] ? a : b));
}

// Noches en las que se vende un tramo: la suya, si es de una noche concreta, o todas las que se ofrecen.
// Sin ninguna noche publicada la venta es "sin noche" (una sola bolsa).
export function nightsFor(tier: { event_id?: string | null }, offered: NightInfo[], anyPublished: boolean): NightInfo[] {
  if (!anyPublished) return [{ id: null, capacity: null }];
  return tier.event_id ? offered.filter((n) => n.id === tier.event_id) : offered;
}

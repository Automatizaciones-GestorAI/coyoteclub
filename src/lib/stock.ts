// Umbral a partir del cual la web avisa "Quedan pocas" (nunca se enseña el número).
export const LOW_STOCK = 20;

export type Availability = 'ok' | 'low' | 'soldout';

// stock null/undefined = sin límite. La taquilla (kind 'door') nunca lleva contador.
export function availability(tier: { kind?: string; stock?: number | null }): Availability {
  if (tier.kind === 'door' || tier.stock === null || tier.stock === undefined) return 'ok';
  if (tier.stock <= 0) return 'soldout';
  return tier.stock <= LOW_STOCK ? 'low' : 'ok';
}

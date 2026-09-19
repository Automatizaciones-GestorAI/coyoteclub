import { supabaseAdmin } from '@/lib/supabase';

// PostgREST devuelve PGRST202 si la función no existe: la migración del stock aún no está
// aplicada. En ese caso el tramo se trata como sin límite para no romper la compra.
const FUNCTION_MISSING = 'PGRST202';

/**
 * Descuenta una entrada del tramo si tiene límite. Devuelve false si está agotado.
 * Lo hace la función SQL reserve_ticket_stock en UNA sola instrucción atómica
 * (UPDATE ... WHERE stock > 0), así que aunque lleguen decenas de compras a la vez
 * nunca se vende de más y nadie se queda fuera habiendo entradas.
 */
export async function reserveStock(tierId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('reserve_ticket_stock', { p_tier: tierId });
  if (error) {
    if (error.code === FUNCTION_MISSING) return true;
    throw error;
  }
  return data === true;
}

// Devuelve una entrada al tramo (p. ej. si falla el alta del ticket tras reservarla).
export async function releaseStock(tierId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('release_ticket_stock', { p_tier: tierId });
  if (error && error.code !== FUNCTION_MISSING) console.error('No se pudo devolver la entrada al tramo', tierId, error.message);
}

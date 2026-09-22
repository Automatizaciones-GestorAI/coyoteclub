import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin
    .from('price_tiers')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const KINDS = ['online', 'door', 'standing'];
const CATEGORIES = ['entrada', 'consumicion'];

// Crea un tramo nuevo. Vale para todas las noches; se añade al final de la lista.
export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }

  const label = String(body?.label ?? '').trim();
  const description = String(body?.description ?? '').trim();
  const priceCents = Number(body?.price_cents);
  const kind = String(body?.kind ?? 'online');
  const category = String(body?.category ?? 'entrada');
  if (label.length < 1 || label.length > 40) return NextResponse.json({ error: 'Escribe un nombre para el tramo (máximo 40 letras)' }, { status: 400 });
  if (description.length > 120) return NextResponse.json({ error: 'La descripción es demasiado larga (máximo 120 letras)' }, { status: 400 });
  if (!Number.isInteger(priceCents) || priceCents < 1 || priceCents > 200_000) return NextResponse.json({ error: 'El precio no es válido' }, { status: 400 });
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'Tipo de tramo no válido' }, { status: 400 });
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Categoría de tramo no válida' }, { status: 400 });

  // Entradas por noche: vacío = sin límite. La taquilla nunca lleva límite.
  let nightLimit: number | null = null;
  if (kind !== 'door' && body?.night_limit !== null && body?.night_limit !== undefined && body?.night_limit !== '') {
    nightLimit = Math.floor(Number(body.night_limit));
    if (!Number.isFinite(nightLimit) || nightLimit < 0 || nightLimit > 100_000) return NextResponse.json({ error: 'El número de entradas por noche no es válido' }, { status: 400 });
  }

  const { data: last } = await supabaseAdmin.from('price_tiers').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const sortOrder = (last?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from('price_tiers')
    .insert({ label, description: description || null, price_cents: priceCents, kind, category, is_active: true, sort_order: sortOrder, night_limit: nightLimit })
    .select()
    .single();
  if (error) {
    console.error('[pricing] no se pudo crear el tramo', error.message);
    return NextResponse.json({ error: 'No se pudo crear el tramo' }, { status: 500 });
  }
  return NextResponse.json(data);
}

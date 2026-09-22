import { adminGuard } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();

  if ('category' in body && !['entrada', 'consumicion'].includes(body.category)) {
    return NextResponse.json({ error: 'Categoría de tramo no válida' }, { status: 400 });
  }

  // Entradas por noche (null = sin límite). Solo se actualiza si el panel lo envía.
  const limitChange: { night_limit?: number | null } = {};
  if ('night_limit' in body) {
    if (body.night_limit === null || body.night_limit === '') {
      limitChange.night_limit = null;
    } else {
      const n = Math.floor(Number(body.night_limit));
      if (!Number.isFinite(n) || n < 0 || n > 100_000) {
        return NextResponse.json({ error: 'Número de entradas no válido' }, { status: 400 });
      }
      limitChange.night_limit = n;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('price_tiers')
    .update({
      label: body.label,
      description: body.description || null,
      price_cents: body.price_cents,
      kind: body.kind,
      category: body.category,
      is_active: body.is_active,
      sort_order: body.sort_order,
      ...limitChange
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  // Un tramo con entradas vendidas, reservadas o anuladas forma parte del historial de ventas: no se borra.
  const blocked = NextResponse.json(
    { error: 'Este tramo ya tiene entradas (vendidas, reservadas o anuladas), así que no se puede borrar. Ocúltalo con «Activo / Oculto» y dejará de venderse.' },
    { status: 409 }
  );
  const { count, error: countError } = await supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true }).eq('tier_id', id);
  if (countError) return NextResponse.json({ error: 'No se pudo comprobar el tramo' }, { status: 500 });
  if ((count ?? 0) > 0) return blocked;

  const { error } = await supabaseAdmin.from('price_tiers').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') return blocked; // alguien compró justo ahora
    console.error('[pricing] no se pudo borrar el tramo', error.message);
    return NextResponse.json({ error: 'No se pudo borrar el tramo' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

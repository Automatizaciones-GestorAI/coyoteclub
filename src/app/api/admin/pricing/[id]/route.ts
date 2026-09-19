import { adminGuard } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const body = await req.json();

  // El stock baja solo con cada venta: solo se actualiza si el panel lo envía a propósito
  // (null = sin límite), para no pisar el valor real con uno antiguo al editar otro campo.
  const stockChange: { stock?: number | null } = {};
  if ('stock' in body) {
    if (body.stock === null || body.stock === '') {
      stockChange.stock = null;
    } else {
      const n = Math.floor(Number(body.stock));
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: 'Número de entradas no válido' }, { status: 400 });
      }
      stockChange.stock = n;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('price_tiers')
    .update({
      label: body.label,
      description: body.description || null,
      price_cents: body.price_cents,
      kind: body.kind,
      is_active: body.is_active,
      sort_order: body.sort_order,
      ...stockChange
    })
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { error } = await supabaseAdmin.from('price_tiers').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

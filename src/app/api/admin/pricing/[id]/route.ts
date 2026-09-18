import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('price_tiers')
    .update({
      label: body.label,
      description: body.description || null,
      price_cents: body.price_cents,
      kind: body.kind,
      is_active: body.is_active,
      sort_order: body.sort_order
    })
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin.from('price_tiers').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

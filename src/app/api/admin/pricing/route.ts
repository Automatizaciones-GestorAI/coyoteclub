import { adminGuard } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('price_tiers')
    .insert({
      event_id: body.event_id || null,
      label: body.label,
      description: body.description || null,
      price_cents: body.price_cents,
      kind: body.kind || 'online',
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
      ...(body.stock !== undefined ? { stock: body.stock } : {})
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

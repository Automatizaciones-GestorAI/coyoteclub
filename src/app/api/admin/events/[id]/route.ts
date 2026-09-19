import { adminGuard } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      title: body.title,
      dj: body.dj || null,
      event_date: body.event_date,
      event_time: body.event_time || null,
      poster_url: body.poster_url || null,
      is_published: body.is_published,
      sort_order: body.sort_order,
      updated_at: new Date().toISOString()
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
  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

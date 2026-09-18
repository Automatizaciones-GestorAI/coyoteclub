import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      title: body.title,
      dj: body.dj || null,
      event_date: body.event_date,
      event_time: body.event_time || null,
      poster_url: body.poster_url || null,
      is_published: body.is_published ?? true,
      sort_order: body.sort_order ?? 0
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

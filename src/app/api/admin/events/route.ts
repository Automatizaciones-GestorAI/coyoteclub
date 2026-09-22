import { adminGuard } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';


// Aforo de la noche (personas). Vacío = sin límite. Si no viene en la petición, no se toca (al crear, la base pone 264).
function parseCapacity(body: any): { skip: true } | { value: number | null } | { error: string } {
  if (!body || !('capacity' in body) || body.capacity === undefined) return { skip: true };
  if (body.capacity === null || String(body.capacity).trim() === '') return { value: null };
  const n = Math.floor(Number(body.capacity));
  if (!Number.isFinite(n) || n < 0 || n > 100_000) return { error: 'El aforo no es válido (escribe un número de personas)' };
  return { value: n };
}

export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;
  const body = await req.json();
  const cap = parseCapacity(body);
  if ('error' in cap) return NextResponse.json({ error: cap.error }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      title: body.title,
      dj: body.dj || null,
      event_date: body.event_date,
      event_time: body.event_time || null,
      poster_url: body.poster_url || null,
      is_published: body.is_published ?? true,
      free_entry: body.free_entry ?? false,
      sort_order: body.sort_order ?? 0,
      ...('value' in cap ? { capacity: cap.value } : {})
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

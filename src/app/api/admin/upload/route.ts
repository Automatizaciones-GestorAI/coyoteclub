import { adminGuard } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Sube un fichero (cartel de evento o foto de galería) al bucket público "media"
export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'misc';
  if (!file) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from('media').upload(path, buffer, {
    contentType: file.type,
    upsert: false
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from('media').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

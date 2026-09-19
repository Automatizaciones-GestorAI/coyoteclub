import { adminGuard } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (el bucket también lo exige)
const FOLDERS = new Set(['posters', 'gallery', 'misc']);

// Formato real del archivo según sus primeros bytes (no nos fiamos del nombre ni del tipo declarado).
function sniff(b: Buffer): { ext: string; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (b.length > 6 && b.subarray(0, 4).toString('ascii') === 'GIF8') return { ext: 'gif', mime: 'image/gif' };
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

// Sube una imagen (cartel de evento o foto de galería) al bucket público "media"
export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }
  const file = formData.get('file');
  const requestedFolder = String(formData.get('folder') || 'misc');
  const folder = FOLDERS.has(requestedFolder) ? requestedFolder : 'misc';
  if (!(file instanceof File)) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'La imagen pesa más de 5 MB' }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buffer);
  if (!kind) return NextResponse.json({ error: 'Solo se admiten imágenes JPG, PNG, WEBP o GIF' }, { status: 415 });

  const path = `${folder}/${crypto.randomUUID()}.${kind.ext}`;
  const { error } = await supabaseAdmin.storage.from('media').upload(path, buffer, {
    contentType: kind.mime,
    upsert: false
  });
  if (error) {
    console.error('[upload]', error.message);
    return NextResponse.json({ error: 'No se pudo subir la imagen' }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from('media').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

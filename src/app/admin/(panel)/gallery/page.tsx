import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '../AdminShell';
import GalleryClient from './GalleryClient';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  await requireAdmin();
  const { data } = await supabaseAdmin.from('gallery_images').select('*').order('sort_order');
  return <GalleryClient initialImages={data || []} />;
}

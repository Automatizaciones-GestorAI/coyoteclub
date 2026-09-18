import { supabaseAdmin } from '@/lib/supabase';
import GalleryClient from './GalleryClient';

export default async function GalleryPage() {
  const { data } = await supabaseAdmin.from('gallery_images').select('*').order('sort_order');
  return <GalleryClient initialImages={data || []} />;
}

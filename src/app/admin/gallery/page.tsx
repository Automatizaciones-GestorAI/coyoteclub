import { supabaseAdmin } from '@/lib/supabase';
import AdminShell, { requireAdmin } from '../AdminShell';
import GalleryClient from './GalleryClient';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  await requireAdmin();
  const { data } = await supabaseAdmin.from('gallery_images').select('*').order('sort_order');
  return (
    <AdminShell>
      <GalleryClient initialImages={data || []} />
    </AdminShell>
  );
}

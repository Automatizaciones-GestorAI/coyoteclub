import { supabaseAdmin } from '@/lib/supabase';
import AdminShell, { requireAdmin } from '../AdminShell';
import PricingClient from './PricingClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  await requireAdmin();
  const { data } = await supabaseAdmin.from('price_tiers').select('*').order('sort_order');
  return (
    <AdminShell>
      <PricingClient initialTiers={data || []} />
    </AdminShell>
  );
}

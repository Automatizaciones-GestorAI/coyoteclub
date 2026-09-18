import { supabaseAdmin } from '@/lib/supabase';
import PricingClient from './PricingClient';

export default async function PricingPage() {
  const { data } = await supabaseAdmin.from('price_tiers').select('*').order('sort_order');
  return <PricingClient initialTiers={data || []} />;
}

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

async function loadProduct(slug: string) {
  const supabase = createPublicClient();
  const [{ data, error }, { data: exchangeRateRow }] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,slug,model,description,price_usd,price_syp,stock_status,installment_enabled,specs,brands(name),product_images(id,url,alt_text,is_primary,position),installment_plans(id,months,first_payment_type,first_payment_value,total_price,monthly_amount,is_active)')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
  ]);
  if (error) throw error;
  return { product: data, exchangeRate: exchangeRateRow?.value ?? null };
}

async function loadProductReviews(productId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id,customer_name,rating,comment,created_at')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export const getCachedProduct = unstable_cache(
  (slug: string) => loadProduct(slug),
  ['louay-public-product'],
  { revalidate: 300 },
);

export const getCachedProductReviews = unstable_cache(
  (productId: string) => loadProductReviews(productId),
  ['louay-public-product-reviews'],
  { revalidate: 300 },
);

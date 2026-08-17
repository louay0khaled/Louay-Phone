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

async function loadBrand(slug: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('brands').select('id,name,slug').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadBrandProducts(slug: string, page: number, pageSize: number) {
  const supabase = createPublicClient();
  const brand = await loadBrand(slug);
  if (!brand) return { brand: null, products: [], count: 0, rate: null };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const [{ data: products, count, error }, { data: rateRow }] = await Promise.all([
    supabase
      .from('products')
      .select('id,brand_id,name,slug,model,price_usd,price_syp,stock_status,installment_enabled,specs,product_images(id,url,alt_text,is_primary,position)', { count: 'exact' })
      .eq('brand_id', brand.id)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
  ]);
  if (error) throw error;
  return { brand, products: products ?? [], count: count ?? 0, rate: rateRow?.value ?? null };
}

async function loadBrandDirectory() {
  const supabase = createPublicClient();
  const [{ data: products, error: productsError }, { data: brands, error: brandsError }, { data: assets, error: assetsError }] = await Promise.all([
    supabase.from('products').select('brand_id').eq('is_active', true),
    supabase.from('brands').select('id,name,slug').order('name'),
    supabase.from('site_assets').select('key,url').like('key', 'brand:%'),
  ]);
  if (productsError) throw productsError;
  if (brandsError) throw brandsError;
  if (assetsError) throw assetsError;
  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    if (product.brand_id) counts.set(product.brand_id, (counts.get(product.brand_id) ?? 0) + 1);
  }
  const imageMap = new Map((assets ?? []).map((asset: any) => [asset.key, asset.url]));
  const brandList = (brands ?? []).filter((brand: any) => brand.id && brand.slug && (counts.get(brand.id) ?? 0) > 0);
  return { brandList, counts: Object.fromEntries(counts), imageMap: Object.fromEntries(imageMap) };
}

export const getCachedProduct = unstable_cache((slug: string) => loadProduct(slug), ['louay-public-product'], { revalidate: 300, tags: ['storefront-products'] });
export const getCachedProductReviews = unstable_cache((productId: string) => loadProductReviews(productId), ['louay-public-product-reviews'], { revalidate: 300, tags: ['storefront-reviews'] });
export const getCachedBrand = unstable_cache((slug: string) => loadBrand(slug), ['louay-public-brand'], { revalidate: 600, tags: ['storefront-brands'] });
export const getCachedBrandProducts = unstable_cache((slug: string, page: number, pageSize: number) => loadBrandProducts(slug, page, pageSize), ['louay-public-brand-products'], { revalidate: 600, tags: ['storefront-catalog'] });
export const getCachedBrandDirectory = unstable_cache(loadBrandDirectory, ['louay-public-brand-directory'], { revalidate: 600, tags: ['storefront-catalog', 'storefront-brands'] });

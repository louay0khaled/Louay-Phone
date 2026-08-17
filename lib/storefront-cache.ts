import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

const PRODUCT_REVALIDATE = 300;
const CATALOG_REVALIDATE = 600;

export function getCachedProduct(slug: string) {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const [{ data: rawProduct, error }, { data: exchangeRateRow }] = await Promise.all([
        supabase
          .from('products')
          .select('id,name,slug,model,description,price_usd,price_syp,stock_status,installment_enabled,specs,brands(name),product_images(id,url,alt_text,is_primary,position),installment_plans(id,months,first_payment_type,first_payment_value,total_price,monthly_amount,is_active)')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
      ]);

      if (error) throw error;
      return { product: rawProduct, exchangeRate: exchangeRateRow?.value ?? null };
    },
    ['storefront-product', slug],
    { revalidate: PRODUCT_REVALIDATE, tags: ['storefront-product', `storefront-product:${slug}`] },
  )();
}

export function getCachedReviews(productId: string) {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from('reviews')
        .select('id,customer_name,rating,comment,created_at')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    ['storefront-reviews', productId],
    { revalidate: CATALOG_REVALIDATE, tags: ['storefront-reviews', `storefront-reviews:${productId}`] },
  )();
}

export function getCachedBrand(slug: string) {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase.from('brands').select('id,name,slug').eq('slug', slug).maybeSingle();
      if (error) throw error;
      return data;
    },
    ['storefront-brand', slug],
    { revalidate: CATALOG_REVALIDATE, tags: ['storefront-brand', `storefront-brand:${slug}`] },
  )();
}

export function getCachedBrandProducts(slug: string, page: number, pageSize: number) {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const brand = await getCachedBrand(slug);
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
    },
    ['storefront-brand-products', slug, String(page), String(pageSize)],
    { revalidate: CATALOG_REVALIDATE, tags: ['storefront-catalog', `storefront-brand:${slug}`] },
  )();
}

export function getCachedBrandDirectory() {
  return unstable_cache(
    async () => {
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
    },
    ['storefront-brand-directory'],
    { revalidate: CATALOG_REVALIDATE, tags: ['storefront-catalog', 'storefront-brand-directory'] },
  )();
}

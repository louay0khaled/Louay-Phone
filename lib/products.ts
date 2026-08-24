import { getSupabase } from '@/lib/supabase';

export type ProductImage = { id?: string; url: string; alt_text?: string | null; is_primary?: boolean | null; position?: number | null };
export type Product = { id: string; brand_id?: string | null; brand?: string | null; name: string; slug: string; model?: string | null; description?: string | null; price_usd?: number | null; price_syp?: number | null; stock_quantity?: number | null; stock_status?: string | null; installment_enabled?: boolean | null; specs?: Record<string, unknown> | null; is_active?: boolean | null; is_featured?: boolean | null; images: ProductImage[] };
export type ProductRow = Omit<Product, 'brand' | 'images'>;
export type HomepageShowcase = { hero_product_id?: string | null; featured_product_ids?: string[] };
export type StoreSettings = { name?: string; currency?: string; secondary_currency?: string };
export type SiteAsset = { key: string; url: string; mime_type?: string | null; version?: number | null };

const productColumns = 'id,brand_id,name,slug,model,description,price_usd,price_syp,stock_quantity,stock_status,installment_enabled,specs,is_active,is_featured,created_at,updated_at';

export function primaryImage(product: Product) { return [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.position ?? 0) - Number(b.position ?? 0))[0]?.url ?? null; }
export function formatUsd(value?: number | null) { if (value == null) return 'السعر عند الطلب'; return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value))}`; }

export async function getActiveProductRows(limit = 300) {
  const supabase = getSupabase(); if (!supabase) return [] as ProductRow[];
  const { data, error } = await supabase.from('products').select(productColumns).eq('is_active', true).order('is_featured', { ascending: false }).order('updated_at', { ascending: false }).limit(limit);
  if (error || !data?.length) return [] as ProductRow[];
  return (data ?? []) as ProductRow[];
}

export async function hydrateProductRows(rows: ProductRow[]) {
  return hydrateProducts(rows);
}

export async function getActiveProducts(limit = 100) {
  const rows = await getActiveProductRows(limit);
  return hydrateProducts(rows);
}

export async function getProductsByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [] as Product[];
  const supabase = getSupabase(); if (!supabase) return [] as Product[];
  const { data, error } = await supabase.from('products').select(productColumns).eq('is_active', true).in('id', uniqueIds);
  if (error || !data?.length) return [] as Product[];
  const hydrated = await hydrateProducts(data as ProductRow[]);
  const rank = new Map(uniqueIds.map((id, index) => [id, index]));
  return hydrated.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
}

export async function getProductBySlug(slug: string) {
  const supabase = getSupabase(); if (!supabase) return null;
  const { data, error } = await supabase.from('products').select(productColumns).eq('slug', slug).eq('is_active', true).maybeSingle();
  if (error || !data) return null;
  const hydrated = await hydrateProducts([data as ProductRow]);
  return hydrated[0] ?? null;
}

export async function getHomepageShowcase(): Promise<HomepageShowcase> {
  const supabase = getSupabase(); if (!supabase) return {};
  const { data } = await supabase.from('settings').select('value').eq('key', 'homepage_showcase').maybeSingle();
  return (data?.value ?? {}) as HomepageShowcase;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = getSupabase(); if (!supabase) return { name: 'Louay Phone', currency: 'SYP', secondary_currency: 'USD' };
  const { data } = await supabase.from('settings').select('value').eq('key', 'store').maybeSingle();
  return (data?.value ?? { name: 'Louay Phone', currency: 'SYP', secondary_currency: 'USD' }) as StoreSettings;
}

export async function getSiteAssets(): Promise<SiteAsset[]> {
  const supabase = getSupabase(); if (!supabase) return [];
  const { data } = await supabase.from('site_assets').select('key,url,mime_type,version').order('key');
  return (data ?? []) as SiteAsset[];
}

async function hydrateProducts(rows: ProductRow[]) {
  const supabase = getSupabase(); if (!supabase || !rows.length) return [] as Product[];
  const brandIds = [...new Set(rows.map((p) => p.brand_id).filter(Boolean))] as string[];
  const productIds = rows.map((p) => p.id);
  const [brandResult, imageResult] = await Promise.all([
    brandIds.length ? supabase.from('brands').select('id,name').in('id', brandIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('product_images').select('id,product_id,url,alt_text,is_primary,position').in('product_id', productIds).order('position', { ascending: true }),
  ]);
  const brands = new Map((brandResult.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
  const images = new Map<string, ProductImage[]>();
  for (const image of imageResult.data ?? []) { const item = image as ProductImage & { product_id: string }; const list = images.get(item.product_id) ?? []; list.push(item); images.set(item.product_id, list); }
  return rows.map((product) => ({ ...product, brand: brands.get(product.brand_id ?? '') ?? 'Louay Phone', images: images.get(product.id) ?? [] }));
}

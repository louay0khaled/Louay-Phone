import { createClient } from '@/lib/supabase/server';
import { getSiteAssets } from '@/lib/site-config';
import HomepageShowcase from '@/components/store/HomepageShowcase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const heroCopy = [
  { tag: 'تكنولوجيا بلا حدود', title: 'أناقة تسبق المستقبل', description: 'اكتشف مجموعة مختارة من أقوى الهواتف العالمية.' },
  { tag: 'أحدث الإصدارات', title: 'قوة في كل تفصيل', description: 'أداء احترافي وتجربة استخدام فائقة السرعة.' },
  { tag: 'اختيار Louay Phone', title: 'تميز لا يشبه الآخرين', description: 'هواتف أصلية بعناية تناسب أسلوب حياتك.' },
];

export default async function Home() {
  const supabase = await createClient();
  const [
    { data: products },
    { data: exchangeRateRow },
    { data: brands },
    { data: brandAssets },
    { count: reviewCount },
    { count: installmentCount },
    { count: productCount },
  ] = await Promise.all([
    supabase.from('products').select('id,name,slug,price_usd,price_syp,installment_enabled,is_featured,product_images(id,url,alt_text,is_primary,position),brands(name)').eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
    supabase.from('brands').select('id,name,slug').order('name'),
    supabase.from('site_assets').select('key,url').like('key', 'brand:%'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', true),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('installment_enabled', true),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);
  const assets = await getSiteAssets();
  const brandImageMap = new Map((brandAssets ?? []).map((item: any) => [item.key, item.url]));
  const brandList = (brands ?? []).filter((brand: any) => brand.id && brand.slug).slice(0, 6).map((brand: any) => ({ ...brand, imageUrl: brandImageMap.get(`brand:${brand.id}`) }));
  const heroSlides = [assets.hero, assets.hero2, assets.hero3].filter(Boolean).map((asset: any, index: number) => ({ url: asset.url, ...heroCopy[index % heroCopy.length] }));
  return <HomepageShowcase logo={assets.logo} slides={heroSlides} products={(products ?? []) as any} brands={brandList} exchangeRate={exchangeRateRow?.value} stats={{ productCount: productCount ?? 0, brandCount: (brands ?? []).length, reviewCount: reviewCount ?? 0, installmentCount: installmentCount ?? 0 }} />;
}

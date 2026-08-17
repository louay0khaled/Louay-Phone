import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createPublicClient } from '@/lib/supabase/public';
import StoreHeader from '@/components/store/StoreHeader';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'الهواتف والماركات',
  description: 'تصفح ماركات Louay Phone والهواتف المنشورة حاليًا مع المواصفات والأسعار والطلب المباشر.',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'الهواتف والماركات | Louay Phone',
    description: 'تصفح الماركات والهواتف المنشورة حاليًا في Louay Phone.',
    type: 'website',
  },
};

export default async function ProductsPage() {
  const supabase = createPublicClient();
  const [{ data: products }, { data: brands }, { data: assets }] = await Promise.all([
    supabase.from('products').select('id,brand_id').eq('is_active', true),
    supabase.from('brands').select('id,name,slug').order('name'),
    supabase.from('site_assets').select('key,url').like('key', 'brand:%'),
  ]);
  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    if (product.brand_id) counts.set(product.brand_id, (counts.get(product.brand_id) ?? 0) + 1);
  }
  const imageMap = new Map((assets ?? []).map((asset: any) => [asset.key, asset.url]));
  const brandList = (brands ?? []).filter((brand: any) => Boolean(brand.id) && Boolean(brand.slug) && (counts.get(brand.id) ?? 0) > 0);

  return <main data-storefront="true" className="storefront-catalog min-h-screen overflow-x-clip bg-[#020617] text-white luxury-grid">
    <StoreHeader />
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl reveal-up">
        <h1 className="text-[2.6rem] font-black tracking-[-.04em] sm:text-5xl">الماركات</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">اختر الماركة للوصول إلى الهواتف المنشورة وأسعارها ومواصفاتها.</p>
      </div>
      {brandList.length ? <div className="brand-directory-grid mt-10">{brandList.map((brand: any) => {
        const brandImage = imageMap.get(`brand:${brand.id}`);
        return <Link key={brand.id} href={`/products/brand/${brand.slug}`} className="brand-directory-card group luxury-card">
          <div className="brand-directory-card__glow" />
          <div className="relative flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-6">
            {brandImage ? <Image src={brandImage} alt={brand.name} width={320} height={160} sizes="(max-width: 640px) 70vw, 320px" className="max-h-28 w-auto max-w-[80%] object-contain transition duration-500 group-hover:scale-105" /> : <span className="text-3xl font-black tracking-tight text-white/90">{brand.name}</span>}
          </div>
          <div className="relative mt-5 flex items-center justify-between gap-4">
            <div><h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{brand.name}</h2><p className="mt-1 text-xs text-slate-500">{counts.get(brand.id) ?? 0} منتج</p></div>
            <span className="text-sky-300 transition-transform duration-300 group-hover:-translate-x-1">←</span>
          </div>
        </Link>;
      })}</div> : <div className="luxury-surface mt-10 rounded-3xl p-14 text-center text-slate-400">لا توجد ماركات متاحة حاليًا.</div>}
    </section>
  </main>;
}

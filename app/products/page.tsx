import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StoreHeader from '@/components/store/StoreHeader';

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: brands }] = await Promise.all([
    supabase.from('products').select('id,brand_id').eq('is_active', true),
    supabase.from('brands').select('id,name,slug').order('name'),
  ]);
  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    if (product.brand_id) counts.set(product.brand_id, (counts.get(product.brand_id) ?? 0) + 1);
  }
  const brandList = (brands ?? []).filter((brand: any) => Boolean(brand.id) && Boolean(brand.slug) && (counts.get(brand.id) ?? 0) > 0);

  return <main data-storefront="true" className="storefront-catalog min-h-screen overflow-x-clip bg-[#020617] text-white luxury-grid">
    <StoreHeader />
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl reveal-up"><div className="luxury-badge"><span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,.9)]" /> BRANDS</div><h1 className="mt-5 text-[2.6rem] font-black tracking-[-.04em] sm:text-5xl">اختر ماركتك</h1><p className="mt-4 max-w-2xl text-sm leading-8 text-slate-400 sm:text-base">اختر الشركة أولًا، ثم تصفّح منتجاتها ضمن صفحة مستقلة ومريحة على الجوال، مع 9 هواتف فقط في كل صفحة.</p></div>
      {brandList.length ? <div className="brand-directory-grid mt-10">{brandList.map((brand: any) => <Link key={brand.id} href={`/products/brand/${brand.slug}`} className="brand-directory-card group luxury-card">
        <div className="brand-directory-card__glow" />
        <div className="relative flex items-start justify-between gap-5"><div><p className="text-[10px] font-black tracking-[.24em] text-sky-400">BRAND</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{brand.name}</h2><p className="mt-2 text-sm text-slate-500">{counts.get(brand.id) ?? 0} هاتف</p></div><div className="brand-directory-card__icon">✦</div></div>
        <div className="relative mt-7 flex items-center justify-between border-t border-sky-300/10 pt-4 text-sm font-bold"><span className="text-slate-500 transition group-hover:text-sky-300">عرض الماركة</span><span className="text-sky-300 transition-transform duration-300 group-hover:-translate-x-1">←</span></div>
      </Link>)}</div> : <div className="luxury-surface mt-10 rounded-3xl p-14 text-center text-slate-400">لا توجد ماركات تحتوي على هواتف منشورة حاليًا.</div>}
    </section>
  </main>;
}

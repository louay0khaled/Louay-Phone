import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BrandsManager from '@/components/admin/BrandsManager';

export const dynamic = 'force-dynamic';

export default async function AdminBrandsPage() {
  const supabase = await createClient();
  const [{ data: brands }, { data: assets }] = await Promise.all([
    supabase.from('brands').select('id,name,slug').order('name'),
    supabase.from('site_assets').select('key,url').like('key', 'brand:%'),
  ]);
  const imageMap = new Map((assets ?? []).map((asset: any) => [asset.key, asset.url]));
  const initialBrands = (brands ?? []).map((brand: any) => ({ ...brand, imageUrl: imageMap.get(`brand:${brand.id}`) ?? null }));

  return <section className="p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black tracking-[.18em] text-sky-300">BRAND CONTROL</p><h1 className="mt-2 text-3xl font-black">صور الماركات</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">أضف أو غيّر صورة كل ماركة كما ستظهر في واجهة المتجر، مع اعتماد الرفع اليدوي فقط.</p></div><Link href="/admin" className="luxury-button-secondary w-fit">← لوحة التحكم</Link></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">إجمالي الماركات</p><b className="mt-1 block text-2xl">{initialBrands.length}</b></div><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">لها صورة</p><b className="mt-1 block text-2xl text-emerald-300">{initialBrands.filter((brand: any) => Boolean(brand.imageUrl)).length}</b></div><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">بدون صورة</p><b className="mt-1 block text-2xl text-amber-300">{initialBrands.filter((brand: any) => !brand.imageUrl).length}</b></div></div>
    <div className="lp-surface mt-5 rounded-3xl p-4 sm:p-6"><BrandsManager initialBrands={initialBrands} /></div>
  </div></section>;
}

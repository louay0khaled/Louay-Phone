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

  return <div className="p-5 sm:p-8 lg:p-10">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8"><span className="luxury-badge">BRANDS</span><h1 className="mt-3 text-3xl font-black">صور الماركات</h1><p className="mt-2 text-sm text-slate-400">أضف أو غيّر صورة كل ماركة كما ستظهر في واجهة المتجر.</p></div>
      <BrandsManager initialBrands={initialBrands} />
    </div>
  </div>;
}

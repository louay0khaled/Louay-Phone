import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BrandTabs from '@/components/store/BrandTabs';

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function currentSyp(priceUsd: unknown, storedSyp: unknown, rateValue: unknown) { const usd = Number(priceUsd || 0); const stored = Number(storedSyp || 0); const value: any = rateValue; const rate = Number(value?.usd_to_syp ?? value?.rate ?? (typeof value === 'string' ? value : 0)); if (usd > 0 && rate > 0) return Math.round(usd * rate); return stored > 0 ? stored : 0; }

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: rawProducts }, { data: rawBrands }, { data: exchangeRateRow }] = await Promise.all([
    supabase.from('products').select('id,brand_id,name,slug,model,price_usd,price_syp,stock_status,installment_enabled,is_featured,specs,product_images(id,url,is_primary,position)').eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('brands').select('id,name,slug').order('name'),
    supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
  ]);

  const products = rawProducts ?? [];
  const brandsById = new Map((rawBrands ?? []).map((brand: any) => [brand.id, brand]));
  const groups = new Map<string, { name: string; slug: string; products: any[] }>();
  for (const raw of products as any[]) { const brand = brandsById.get(raw.brand_id) ?? { name: 'أخرى', slug: 'other' }; if (!groups.has(brand.name)) groups.set(brand.name, { name: brand.name, slug: brand.slug || slugify(brand.name), products: [] }); groups.get(brand.name)!.products.push({ ...raw, brand }); }
  const brandGroups = [...groups.values()];
  const tabBrands = brandGroups.map((brand) => ({ name: brand.name, slug: brand.slug, count: brand.products.length }));

  return (
    <main dir="rtl" className="min-h-screen overflow-x-clip bg-[#020617] text-white luxury-grid">
      <header className="sticky top-0 z-40 border-b border-sky-300/10 bg-slate-950/72 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/20 bg-gradient-to-br from-sky-200 via-sky-400 to-sky-600 font-black text-slate-950 shadow-lg shadow-sky-500/20 transition-transform group-hover:rotate-3">LP</div><div><div className="text-base font-black tracking-tight sm:text-lg">Louay Phone</div><div className="hidden text-[9px] font-bold tracking-[.22em] text-slate-500 sm:block">PREMIUM SMARTPHONES</div></div></Link>
          <Link href="/" className="luxury-button-secondary !min-h-10 !rounded-xl !px-4 !py-2 text-sm">الرئيسية</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="reveal-up mb-9 max-w-3xl">
          <div className="luxury-badge"><span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,.9)]" /> CATALOG</div>
          <h1 className="mt-5 text-[2.5rem] font-black tracking-[-.04em] sm:text-5xl">كتالوج Louay Phone</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-400 sm:text-base">استكشف العلامات التجارية والموديلات ضمن تجربة أقرب لتطبيق متجر عالمي: سريعة، مرنة، ومريحة على الهاتف.</p>
        </div>

        <BrandTabs brands={tabBrands} />

        <div className="space-y-16">
          {brandGroups.map((brand, groupIndex) => (
            <section key={brand.slug} id={`brand-${brand.slug}`} className="scroll-mt-36 reveal-up" style={{ animationDelay: `${Math.min(groupIndex * 55, 420)}ms` }}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div><p className="text-[11px] font-black tracking-[.24em] text-sky-400">{String(brand.name).toUpperCase()}</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{brand.name}</h2></div>
                <span className="hidden rounded-full border border-sky-300/10 bg-sky-400/5 px-3 py-1.5 text-xs font-bold text-sky-200 sm:inline-flex">{brand.products.length} منتج</span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {brand.products.map((p: any) => {
                  const images = [...(p.product_images ?? [])].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
                  const img = images.find((x: any) => x.is_primary) ?? images[0];
                  const note = p.specs?.notes;
                  const priceSyp = currentSyp(p.price_usd, p.price_syp, exchangeRateRow?.value);
                  return (
                    <Link href={`/product/${p.slug}`} key={p.id} className="group luxury-card overflow-hidden">
                      <div className="product-media relative aspect-square overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(56,189,248,.10),transparent_48%)]" />
                        {img?.url ? <img src={img.url} alt={p.name} className="product-image relative z-10 h-full w-full object-contain p-7 transition-[transform,filter] duration-700 ease-out group-hover:scale-105 group-hover:brightness-110" /> : <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-500"><div className="flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-sky-300/10 bg-sky-400/5 text-2xl text-sky-300 shadow-inner shadow-sky-500/5">✦</div><span className="text-xs font-bold">الصورة ستُضاف لاحقًا</span></div>}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#020617]/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        {p.installment_enabled && <span className="luxury-badge absolute right-4 top-4 z-20">تقسيط</span>}
                      </div>
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-sky-400">{brand.name}</p>{p.stock_status === 'in_stock' && <span className="text-[10px] font-bold text-emerald-300">متوفر</span>}</div>
                        <h3 className="mt-2 line-clamp-2 min-h-[3.25rem] text-[1.02rem] font-extrabold leading-6 tracking-tight text-white">{p.name}</h3>
                        {p.model && p.model !== '-' && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{p.model}{note ? ` • ${note}` : ''}</p>}
                        <div className="luxury-divider my-4" />
                        <div className="flex items-end justify-between gap-3"><div><b className="text-base text-white">{priceSyp ? `${priceSyp.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</b>{p.price_usd && <p className="mt-1 text-xs text-slate-500">${Number(p.price_usd).toLocaleString()}</p>}</div><span className="text-xs font-bold text-slate-500 transition group-hover:text-sky-300">التفاصيل ←</span></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        {!brandGroups.length && <div className="luxury-surface rounded-3xl p-16 text-center text-slate-400">لا توجد هواتف منشورة حاليًا.</div>}
      </section>
    </main>
  );
}

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderForm from '@/components/store/OrderForm';
import StoreHeader from '@/components/store/StoreHeader';

function currentSyp(priceUsd: unknown, storedSyp: unknown, rateValue: unknown) {
  const usd = Number(priceUsd || 0);
  const stored = Number(storedSyp || 0);
  const value: any = rateValue;
  const rate = Number(value?.usd_to_syp ?? value?.rate ?? (typeof value === 'string' ? value : 0));
  if (usd > 0 && rate > 0) return Math.round(usd * rate);
  return stored > 0 ? stored : 0;
}

export default async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const supabase = await createClient();
  const [{ data: rawProduct, error }, { data: exchangeRateRow }] = await Promise.all([
    supabase.from('products').select('id,name,slug,model,description,price_usd,price_syp,stock_status,installment_enabled,specs,brands(name),product_images(id,url,alt_text,is_primary,position),installment_plans(id,months,first_payment_type,first_payment_value,total_price,monthly_amount,is_active)').eq('slug', slug).eq('is_active', true).maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
  ]);
  if (error) console.error('Product details lookup failed:', error);
  const p = rawProduct as any;
  if (!p) notFound();
  const images = [...(p.product_images ?? [])].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
  const plans = (p.installment_plans ?? []).filter((x: any) => x.is_active);
  const specs = (p.specs ?? {}) as Record<string, unknown>;
  const priceSyp = currentSyp(p.price_usd, p.price_syp, exchangeRateRow?.value);

  return <main dir="rtl" className="min-h-screen overflow-x-clip bg-[#020617] text-white luxury-grid">
    <StoreHeader />
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-8 lg:py-12">
      <div className="reveal-up space-y-4">
        <div className="product-visual product-media relative aspect-square overflow-hidden rounded-[2rem] border border-sky-300/10 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,rgba(56,189,248,.12),transparent_35%)]" />
          {images[0]?.url ? <img src={images[0].url} alt={images[0].alt_text ?? p.name} className="product-image relative z-10 h-full w-full object-contain p-8 sm:p-12" /> : <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 text-slate-500"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-300/10 bg-sky-400/5 text-3xl text-sky-300">✦</div><span className="text-sm font-bold">الصورة ستُضاف لاحقًا</span></div>}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617]/70 to-transparent" />
        </div>
        {images.length > 1 && <div className="grid grid-cols-5 gap-3">{images.slice(0, 5).map((i: any) => <div key={i.id} className="product-media aspect-square overflow-hidden rounded-2xl border border-sky-300/10"><img src={i.url} alt={i.alt_text ?? p.name} className="product-image h-full w-full object-contain p-2" /></div>)}</div>}
      </div>
      <div className="reveal-up lg:pt-4" style={{ animationDelay: '90ms' }}>
        <div className="luxury-badge">{p.brands?.name ?? 'Louay Phone'}</div>
        <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-.04em] sm:text-5xl">{p.name}</h1>
        {p.model && <p className="mt-3 text-sm text-slate-500">{p.model}</p>}
        <div className="luxury-divider my-6" />
        <div className="flex flex-wrap items-end gap-x-7 gap-y-4"><div><p className="text-xs font-bold text-slate-500">السعر الحالي</p><b className="mt-1 block text-3xl tracking-tight">{priceSyp ? `${priceSyp.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</b></div>{p.price_usd && <div className="pb-1"><p className="text-xs text-slate-600">بالدولار</p><p className="mt-1 text-sm font-bold text-slate-300">${Number(p.price_usd).toLocaleString()}</p></div>}</div>
        {p.description && <p className="mt-7 max-w-2xl whitespace-pre-line text-sm leading-8 text-slate-400 sm:text-base">{p.description}</p>}
        <div className="glass mt-8 rounded-[1.5rem] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">المواصفات</h2><span className="luxury-badge">معلومات المنتج</span></div>{Object.keys(specs).length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(specs).map(([k, v]) => <div key={k} className="rounded-2xl border border-white/[.06] bg-white/[.025] p-3.5 transition hover:border-sky-300/15 hover:bg-sky-400/[.03]"><span className="text-[11px] font-bold text-slate-500">{k}</span><p className="mt-1 text-sm font-bold text-slate-200">{String(v)}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">ستتوفر المواصفات بالتفصيل قريبًا.</p>}</div>
        <OrderForm product={p} plans={plans} />
      </div>
    </section>
  </main>;
}

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const features = [
  ['01', 'اختيار احترافي', 'مواصفات واضحة وصور عالية الجودة قبل اتخاذ قرارك.'],
  ['02', 'تقسيط مرن', 'خطط تقسيط شفافة ومفهومة لكل هاتف متاح للتقسيط.'],
  ['03', 'دعم مباشر', 'تواصل سريع ومباشر من داخل الموقع دون مغادرة تجربة الشراء.'],
] as const;

function currentSyp(priceUsd: unknown, storedSyp: unknown, rateValue: unknown) {
  const usd = Number(priceUsd || 0);
  const stored = Number(storedSyp || 0);
  const value: any = rateValue;
  const rate = Number(value?.usd_to_syp ?? value?.rate ?? (typeof value === 'string' ? value : 0));
  if (usd > 0 && rate > 0) return Math.round(usd * rate);
  return stored > 0 ? stored : 0;
}

function ProductCard({ product, exchangeRate }: { product: any; exchangeRate: unknown }) {
  const images = [...(product.product_images ?? [])].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
  const image = images.find((item: any) => item.is_primary) ?? images[0];
  const priceSyp = currentSyp(product.price_usd, product.price_syp, exchangeRate);
  return (
    <Link href={`/product/${product.slug}`} className="group luxury-card overflow-hidden">
      <div className="relative aspect-[4/4.4] overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(56,189,248,.12),transparent_48%),linear-gradient(145deg,#0b1424,#020617)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(56,189,248,.05))]" />
        {image?.url ? <img src={image.url} alt={image.alt_text || product.name} className="relative h-full w-full object-contain p-7 transition duration-700 ease-out group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">لا توجد صورة</div>}
        {product.installment_enabled && <span className="luxury-badge absolute right-4 top-4">تقسيط متاح</span>}
      </div>
      <div className="p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-sky-400">{product.brands?.name ?? 'Louay Phone'}</p>
        <h3 className="mt-2 text-lg font-extrabold tracking-tight text-white">{product.name}</h3>
        <div className="luxury-divider my-4" />
        <div className="flex items-end justify-between gap-3">
          <div><b className="text-base">{priceSyp ? `${priceSyp.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</b>{product.price_usd && <p className="mt-1 text-xs text-slate-500">${Number(product.price_usd).toLocaleString()}</p>}</div>
          <span className="text-xs font-bold text-slate-500 transition group-hover:text-sky-300">التفاصيل ←</span>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const [{ data: products, error }, { data: exchangeRateRow }] = await Promise.all([
    supabase.from('products').select('id,name,slug,price_usd,price_syp,installment_enabled,is_featured,product_images(id,url,alt_text,is_primary,position),brands(name)').eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(8),
    supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
  ]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white luxury-grid">
      <header className="sticky top-0 z-30 border-b border-sky-300/10 bg-[#020617]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-300 to-sky-600 font-black text-slate-950 shadow-lg shadow-sky-500/20">LP</div><div><div className="text-base font-black tracking-tight sm:text-lg">Louay Phone</div><div className="hidden text-[9px] font-bold tracking-[.2em] text-slate-500 sm:block">PREMIUM SMARTPHONES</div></div></Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-400 md:flex"><Link href="/products" className="transition hover:text-sky-300">الهواتف</Link><a href="#features" className="transition hover:text-sky-300">لماذا نحن</a><button type="button" data-open-chat className="transition hover:text-sky-300">تواصل معنا</button></nav>
          <Link href="/products" className="luxury-button !min-h-10 !rounded-xl !px-4 !py-2 text-sm">تصفح الهواتف</Link>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100dvh-72px)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-20">
        <div className="relative z-10">
          <div className="luxury-badge mb-6"><span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,.9)]" /> تجربة هاتف مختلفة</div>
          <h1 className="max-w-4xl text-[2.7rem] font-black leading-[1.18] tracking-[-.04em] sm:text-6xl lg:text-[5.25rem]">هاتفك القادم،<br /><span className="bg-gradient-to-l from-sky-200 via-sky-400 to-sky-600 bg-clip-text text-transparent">بثقة وأناقة.</span></h1>
          <p className="mt-7 max-w-2xl text-sm leading-8 text-slate-400 sm:text-lg">اكتشف مجموعة مختارة من أحدث الهواتف، بمعلومات دقيقة، صور واضحة، وخيارات تقسيط شفافة تساعدك على اتخاذ القرار بثقة.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/products" className="luxury-button px-7">استكشف الهواتف <span>←</span></Link><button type="button" data-open-chat className="luxury-button-secondary px-7">تحدث مع مستشار</button></div>
          <div className="mt-10 flex flex-wrap gap-6 border-t border-white/10 pt-6 text-xs text-slate-500"><span><b className="block text-lg text-white">01</b>اختيار مدروس</span><span><b className="block text-lg text-white">02</b>تقسيط واضح</span><span><b className="block text-lg text-white">03</b>دعم مباشر</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-md lg:max-w-lg"><div className="absolute -inset-12 rounded-full bg-sky-500/10 blur-3xl" /><div className="glass glow relative rounded-[2rem] p-3 sm:p-5"><div className="relative flex min-h-[500px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-sky-300/10 bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,.16),transparent_34%),linear-gradient(145deg,#0b1424,#020617)] p-6 sm:min-h-[560px]"><div className="flex items-center justify-between text-[10px] font-black tracking-[.25em] text-sky-300"><span>LOUAY PHONE</span><span>2026 COLLECTION</span></div><div className="relative mx-auto flex h-64 w-36 rotate-6 items-center justify-center rounded-[2.4rem] border-[5px] border-slate-600 bg-slate-950 shadow-[0_35px_80px_rgba(0,0,0,.65),0_0_55px_rgba(14,165,233,.13)]"><div className="absolute right-2 top-6 h-20 w-3 rounded-full bg-slate-800" /><div className="h-40 w-2 rounded-full bg-gradient-to-b from-sky-300/50 to-transparent" /></div><div><div className="text-xs font-bold tracking-[.18em] text-slate-500">PREMIUM COLLECTION</div><div className="mt-2 text-2xl font-black sm:text-3xl">أحدث التقنيات،<br />بأسلوب يليق بك.</div><div className="mt-5 h-px bg-gradient-to-l from-sky-400/50 to-transparent" /></div></div></div></div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="mb-10 max-w-xl"><p className="text-xs font-black tracking-[.2em] text-sky-400">THE EXPERIENCE</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">تجربة شراء مصممة بعناية</h2><p className="mt-4 text-sm leading-7 text-slate-500">كل تفصيل في Louay Phone هدفه أن يجعل اختيار هاتفك أوضح وأسهل.</p></div><div className="grid gap-4 md:grid-cols-3">{features.map(([number, title, text]) => <article key={number} className="luxury-card group p-6 sm:p-7"><div className="flex items-center justify-between"><span className="text-xs font-black text-sky-400">{number}</span><span className="h-px w-12 bg-sky-400/30 transition group-hover:w-20" /></div><h2 className="mt-8 text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></article>)}</div></section>
      <section id="products" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="mb-9 flex items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.2em] text-sky-400">CURATED COLLECTION</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">الهواتف المميزة</h2></div><Link href="/products" className="hidden text-sm font-bold text-sky-300 transition hover:text-sky-200 sm:block">عرض المجموعة كاملة ←</Link></div>{error ? <div className="luxury-surface rounded-3xl p-10 text-center text-red-300">تعذر تحميل المنتجات حاليًا.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{(products ?? []).map((product: any) => <ProductCard key={product.id} product={product} exchangeRate={exchangeRateRow?.value} />)}</div>}{!error && !products?.length && <div className="luxury-surface rounded-3xl p-10 text-center text-slate-400">لا توجد هواتف منشورة حاليًا.</div>}<div className="mt-7 text-center sm:hidden"><Link href="/products" className="luxury-button-secondary">عرض جميع الهواتف</Link></div></section>
      <footer className="mt-10 border-t border-sky-300/10 bg-slate-950/40"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div><div className="text-lg font-black">Louay Phone</div><div className="mt-1 text-sm text-slate-500">هواتف ذكية، تجربة راقية.</div></div><button type="button" data-open-chat className="text-right text-sm font-bold text-slate-500 transition hover:text-sky-300">الدعم المباشر ←</button></div></footer>
    </main>
  );
}

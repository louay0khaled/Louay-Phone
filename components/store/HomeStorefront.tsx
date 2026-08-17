import Image from 'next/image';
import Link from 'next/link';
import StoreHeader from '@/components/store/StoreHeader';

type Product = {
  id: string;
  name: string;
  slug: string;
  model?: string | null;
  price_usd?: number | null;
  price_syp?: number | null;
  stock_status?: string | null;
  installment_enabled?: boolean | null;
  brands?: { name?: string | null } | null;
  product_images?: { url: string; alt_text?: string | null; is_primary?: boolean | null }[];
};

type HomeData = {
  products: Product[];
  productCount: number;
  reviewCount: number;
  avgRating: number;
  brandCount: number;
  exchangeRate: unknown;
};

function currentSyp(priceUsd: unknown, storedSyp: unknown, rateValue: unknown) {
  const usd = Number(priceUsd || 0);
  const stored = Number(storedSyp || 0);
  const value: any = rateValue;
  const rate = Number(value?.usd_to_syp ?? value?.rate ?? (typeof value === 'string' || typeof value === 'number' ? value : 0));
  if (usd > 0 && rate > 0) return Math.round(usd * rate);
  return stored > 0 ? stored : 0;
}

export default function HomeStorefront({ data }: { data: HomeData }) {
  const featured = data.products.slice(0, 6);
  const trustStats = [
    { value: data.productCount ? `+${data.productCount.toLocaleString('ar-SY')}` : '—', label: 'منتجات فعلية في المتجر' },
    { value: data.brandCount ? `+${data.brandCount.toLocaleString('ar-SY')}` : '—', label: 'علامة متوفرة' },
    { value: data.reviewCount ? `+${data.reviewCount.toLocaleString('ar-SY')}` : '—', label: 'تقييم منشور' },
    { value: data.avgRating ? data.avgRating.toFixed(1) : '—', label: 'متوسط التقييم' },
  ];
  return (
    <main className="min-h-screen overflow-x-clip bg-[#020617] text-white">
      <StoreHeader />
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="absolute inset-x-0 top-0 -z-0 h-[540px] bg-[radial-gradient(circle_at_78%_20%,rgba(14,165,233,.18),transparent_34%),radial-gradient(circle_at_20%_10%,rgba(56,189,248,.10),transparent_30%)]" />
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[.88fr_1.12fr] lg:gap-14">
          <div className="text-center lg:text-right">
            <span className="luxury-badge">Louay Phone · متجر الهواتف</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-.045em] sm:text-6xl lg:text-7xl">هاتفك القادم لا يحتاج إلى بحث طويل.<span className="mt-2 block bg-gradient-to-l from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">يحتاج إلى الاختيار الصحيح.</span></h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-slate-400 sm:text-base lg:mx-0">تصفّح الأجهزة المتوفرة فعليًا، اطّلع على المواصفات والسعر الحالي، ثم أرسل طلبك مباشرة من صفحة المنتج بدون خطوات زائدة.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"><Link href="/products" className="luxury-button min-h-14 px-7 text-base">تصفّح الهواتف <span aria-hidden>←</span></Link><Link href="#featured" className="luxury-button-secondary min-h-14 px-7 text-base">شاهد المختارات</Link></div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-slate-400 lg:justify-start"><span>✓ معلومات مرتبطة بالمنتج الحقيقي</span><span>✓ طلب مباشر</span><span>✓ دعم عبر المحادثة</span></div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-sky-300/10 bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,.16),transparent_30%),linear-gradient(145deg,#0b1424,#030913_72%,#020617)] p-4 shadow-[0_40px_120px_rgba(0,0,0,.35)] sm:p-6">
            <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
              {featured[0]?.product_images?.[0]?.url ? <Image src={featured[0].product_images[0].url} alt={featured[0].product_images[0].alt_text ?? featured[0].name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-8 sm:p-12" /> : <div className="text-center text-slate-500"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-sky-300/10 bg-sky-400/5 text-3xl text-sky-300">✦</div><p className="mt-4 text-sm font-bold">أضف صورة المنتج من لوحة الإدارة لتظهر هنا</p></div>}
            </div>
            {featured[0] && <Link href={`/product/${featured[0].slug}`} className="mt-4 block rounded-2xl border border-sky-300/10 bg-white/[.03] p-4 transition hover:border-sky-300/25 hover:bg-sky-400/[.04]"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold text-sky-300">اختيار اليوم</p><p className="mt-1 text-lg font-black">{featured[0].name}</p><p className="mt-1 text-xs text-slate-500">{featured[0].brands?.name ?? 'Louay Phone'}{featured[0].model ? ` · ${featured[0].model}` : ''}</p></div><strong className="text-lg">{currentSyp(featured[0].price_usd, featured[0].price_syp, data.exchangeRate) ? `${currentSyp(featured[0].price_usd, featured[0].price_syp, data.exchangeRate).toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</strong></div></Link>}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8"><div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025] sm:grid-cols-4">{trustStats.map((stat) => <div key={stat.label} className="border-white/10 p-5 text-center sm:border-l last:border-l-0"><strong className="block text-2xl font-black text-sky-200 sm:text-3xl">{stat.value}</strong><span className="mt-2 block text-xs text-slate-500">{stat.label}</span></div>)}</div></section>
      <section id="featured" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><span className="section-kicker">مختارات حقيقية من المخزون</span><h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">اختيارات تستحق نظرة جدية</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">الأسعار والبيانات التالية مأخوذة من كتالوج المتجر بدل بطاقات تسويقية ثابتة.</p></div><Link href="/products" className="text-sm font-bold text-sky-300 transition hover:text-white">عرض كل الهواتف ←</Link></div>
        {featured.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((product) => { const image = product.product_images?.find((item) => item.is_primary) ?? product.product_images?.[0]; const inStock = product.stock_status === 'in_stock'; const priceSyp = currentSyp(product.price_usd, product.price_syp, data.exchangeRate); return <Link key={product.id} href={`/product/${product.slug}`} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[.025] transition duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-400/[.035]"><div className="relative aspect-square overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,.12),transparent_35%),linear-gradient(145deg,#0b1424,#030913)]">{image?.url ? <Image src={image.url} alt={image.alt_text ?? product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-contain p-8 transition duration-500 group-hover:scale-[1.04]" /> : <div className="grid h-full place-items-center text-slate-600">لا توجد صورة</div>}<div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2"><span className="luxury-badge">{product.brands?.name ?? 'Louay Phone'}</span><span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${inStock ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/20 bg-amber-400/10 text-amber-200'}`}>{inStock ? 'متوفر' : 'اسأل عن التوفر'}</span></div></div><div className="p-5"><h3 className="text-xl font-black tracking-tight">{product.name}</h3>{product.model && <p className="mt-1 text-xs text-slate-500">{product.model}</p>}<div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-4"><div><p className="text-[11px] text-slate-500">السعر الحالي</p><strong className="mt-1 block text-xl">{priceSyp ? `${priceSyp.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</strong>{product.price_usd ? <span className="mt-1 block text-[11px] text-slate-600">${Number(product.price_usd).toLocaleString('en-US')}</span> : null}</div><span className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/10 bg-sky-400/5 text-sky-300 transition group-hover:border-sky-300/25 group-hover:bg-sky-400/10" aria-hidden>←</span></div></div></Link>; })}</div> : <div className="mt-10 rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">لا توجد منتجات مميزة حاليًا.</div>}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,.8),rgba(2,6,23,.92))] p-7 sm:p-10 lg:p-12"><div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><span className="section-kicker">لماذا Louay Phone؟</span><h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">قرار شراء أوضح، بدون ضوضاء</h2><p className="mt-5 max-w-2xl text-sm leading-8 text-slate-400">نحن نعرض البيانات التي تساعدك على اتخاذ القرار: المنتج الحقيقي، مواصفاته، سعره، توفره، وطريقة الطلب. التفاصيل المهمة يجب أن تكون واضحة قبل التواصل معنا.</p></div><div className="grid gap-3 sm:grid-cols-2">{[['01','بيانات مرتبطة بالمنتج','لا بطاقات تسويقية وهمية.'],['02','صفحة منتج مركّزة','كل ما تحتاجه قبل الطلب في مكان واحد.'],['03','طلب مباشر','اسم، هاتف، مدينة، ثم تأكيد.'],['04','دعم سريع','المحادثة متاحة وقت الحاجة.']].map(([n,title,text]) => <div key={n} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><span className="text-xs font-black text-sky-300">{n}</span><h3 className="mt-3 text-base font-black">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p></div>)}</div></div></div></section>
    </main>
  );
}

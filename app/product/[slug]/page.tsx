import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import OrderForm from '@/components/store/OrderForm';
import StoreHeader from '@/components/store/StoreHeader';
import { getCachedProduct } from '@/lib/storefront-data';

export const revalidate = 300;

function currentSyp(priceUsd: unknown, storedSyp: unknown, rateValue: unknown) {
  const usd = Number(priceUsd || 0);
  const stored = Number(storedSyp || 0);
  const value: any = rateValue;
  const rate = Number(value?.usd_to_syp ?? value?.rate ?? (typeof value === 'string' ? value : 0));
  if (usd > 0 && rate > 0) return Math.round(usd * rate);
  return stored > 0 ? stored : 0;
}

function specLabel(key: string) {
  const labels: Record<string, string> = { memory: 'الذاكرة والتخزين', ram: 'الذاكرة العشوائية', storage: 'التخزين', display: 'الشاشة', processor: 'المعالج', camera: 'الكاميرا', battery: 'البطارية', network: 'الشبكة', notes: 'ملاحظات' };
  return labels[key] ?? key;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { product: rawData } = await getCachedProduct(slug);
  const data = rawData as any;
  if (!data) return { title: 'المنتج غير موجود' };
  const image = [...(data.product_images ?? [])].sort((a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0))[0];
  const brand = data.brands?.name ?? 'Louay Phone';
  const title = `${brand} ${data.name}${data.model ? ` ${data.model}` : ''}`;
  return {
    title,
    description: data.description || `${title} — المواصفات والسعر الحالي وطلب مباشر من Louay Phone.`,
    alternates: { canonical: `/product/${data.slug}` },
    openGraph: { title: `${title} | Louay Phone`, description: data.description || 'مواصفات واضحة وسعر حالي وطلب مباشر.', type: 'website', images: image?.url ? [{ url: image.url, alt: image.alt_text ?? title }] : [] },
  };
}

export default async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { product: rawProduct, exchangeRate } = await getCachedProduct(slug);
  const p = rawProduct as any;
  if (!p) notFound();

  const images = [...(p.product_images ?? [])].sort((a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0));
  const plans = (p.installment_plans ?? []).filter((x: any) => x.is_active);
  const specs = Object.entries((p.specs ?? {}) as Record<string, unknown>).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');
  const priceSyp = currentSyp(p.price_usd, p.price_syp, exchangeRate);
  const inStock = p.stock_status === 'in_stock';
  const primaryImage = images[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.brands?.name ? `${p.brands.name} ` : ''}${p.name}${p.model ? ` ${p.model}` : ''}`,
    description: p.description || undefined,
    image: images.slice(0, 5).map((image: any) => image.url),
    brand: p.brands?.name ? { '@type': 'Brand', name: p.brands.name } : undefined,
    offers: priceSyp ? { '@type': 'Offer', priceCurrency: 'SYP', price: priceSyp, availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://louay-phone.vercel.app'}/product/${p.slug}` } : undefined,
  };

  return (
    <main data-storefront="true" className="storefront-product min-h-screen overflow-x-clip bg-[#020617] text-white luxury-grid">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StoreHeader />
      <div className="mx-auto max-w-7xl px-4 pt-5 text-xs text-slate-600 sm:px-6 lg:px-8"><nav aria-label="breadcrumb"><a className="transition hover:text-sky-300" href="/">الرئيسية</a><span className="px-2">/</span><a className="transition hover:text-sky-300" href="/products">الهواتف</a><span className="px-2">/</span><span className="text-slate-400">{p.name}</span></nav></div>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-8 lg:py-10">
        <div className="space-y-4">
          <div className="product-visual product-media relative aspect-square overflow-hidden rounded-[2rem] border border-sky-300/10 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,rgba(56,189,248,.12),transparent_35%)]" />
            {primaryImage?.url ? <Image src={primaryImage.url} alt={primaryImage.alt_text ?? p.name} fill priority sizes="(max-width: 1024px) 100vw, 52vw" className="relative z-10 object-contain p-8 sm:p-12" /> : <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 text-slate-500"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-300/10 bg-sky-400/5 text-3xl text-sky-300">✦</div><span className="text-sm font-bold">الصورة ستُضاف لاحقًا</span></div>}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617]/70 to-transparent" />
          </div>
          {images.length > 1 && <div className="grid grid-cols-5 gap-3">{images.slice(0, 5).map((image: any) => <div key={image.id} className="product-media relative aspect-square overflow-hidden rounded-2xl border border-sky-300/10"><Image src={image.url} alt={image.alt_text ?? p.name} fill sizes="(max-width: 640px) 20vw, 10vw" className="object-contain p-2" loading="lazy" /></div>)}</div>}
        </div>

        <div className="lg:pt-4">
          <div className="flex flex-wrap items-center gap-2"><span className="luxury-badge">{p.brands?.name ?? 'Louay Phone'}</span><span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${inStock ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/20 bg-amber-400/10 text-amber-200'}`}>{inStock ? 'متوفر حاليًا' : 'تحقق من التوفر'}</span></div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-.04em] sm:text-5xl">{p.name}</h1>
          {p.model && <p className="mt-3 text-sm text-slate-500">{p.model}</p>}
          <div className="luxury-divider my-6" />
          <div className="flex flex-wrap items-end gap-x-7 gap-y-4"><div><p className="text-xs font-bold text-slate-500">السعر الحالي</p><b className="mt-1 block text-3xl tracking-tight">{priceSyp ? `${priceSyp.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</b></div>{p.price_usd ? <div className="pb-1"><p className="text-xs text-slate-600">بالدولار</p><p className="mt-1 text-sm font-bold text-slate-300">${Number(p.price_usd).toLocaleString('en-US')}</p></div> : null}</div>
          {p.description && <p className="mt-7 max-w-2xl whitespace-pre-line text-sm leading-8 text-slate-400 sm:text-base">{p.description}</p>}
          <div className="mt-8 rounded-[1.5rem] border border-sky-300/10 bg-white/[.025] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">المواصفات</h2><span className="luxury-badge">معلومات المنتج</span></div>{specs.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{specs.map(([key, value]) => <div key={key} className="rounded-2xl border border-white/[.06] bg-black/10 p-3.5 transition hover:border-sky-300/15 hover:bg-sky-400/[.03]"><span className="text-[11px] font-bold text-slate-500">{specLabel(key)}</span><p className="mt-1 text-sm font-bold text-slate-200">{String(value)}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">ستتوفر المواصفات بالتفصيل قريبًا.</p>}</div>
          {(p.installment_enabled || plans.length) && <div className="mt-5 rounded-[1.5rem] border border-sky-300/10 bg-sky-400/[.035] p-5"><h2 className="text-base font-black">التقسيط</h2><p className="mt-2 text-sm leading-7 text-slate-400">هذا المنتج يدعم خيارات تقسيط؛ ستظهر التفاصيل ضمن نموذج الطلب المتاح أدناه.</p>{plans.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{plans.map((plan: any) => <span key={plan.id} className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-slate-300">{plan.months} شهر</span>)}</div>}</div>}
          <OrderForm product={p} plans={plans} />
        </div>
      </section>
    </main>
  );
}

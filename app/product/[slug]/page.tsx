import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductGallery from '@/app/components/ProductGallery';
import { formatUsd, getActiveProducts, getProductBySlug, primaryImage } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'المنتج غير موجود' };
  const description = product.description?.slice(0, 155) || `${product.name} من ${product.brand ?? 'Louay Phone'} — السعر والمواصفات والتوفر.`;
  const image = primaryImage(product);
  return {
    title: `${product.name}${product.model ? ` ${product.model}` : ''}`,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { type: 'website', title: `${product.name} | Louay Phone`, description, url: `/product/${product.slug}`, ...(image ? { images: [{ url: image, alt: product.name }] } : {}) },
  };
}

function titleCase(key: string) {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isDisplayableValue(value: unknown) {
  return value !== null && value !== undefined && value !== '' && typeof value !== 'object';
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getActiveProducts(24)).filter((item) => item.id !== product.id && item.brand_id === product.brand_id && primaryImage(item)).slice(0, 3);
  const specEntries = Object.entries(product.specs ?? {}).filter(([, value]) => isDisplayableValue(value)).slice(0, 30);
  const image = primaryImage(product);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, brand: { '@type': 'Brand', name: product.brand ?? 'Louay Phone' }, sku: product.id, image: image ? [image] : [], description: product.description ?? undefined, offers: product.price_usd != null ? { '@type': 'Offer', priceCurrency: 'USD', price: Number(product.price_usd), availability: product.stock_status === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: `https://louay-phone.vercel.app/product/${product.slug}` } : undefined };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="announcement">Louay Phone — تفاصيل المنتج</div>
      <header className="site-nav"><div className="container site-nav__row"><Link href="/" className="brand">Louay <span>Phone</span></Link><nav className="nav-links" aria-label="التنقل الرئيسي"><Link href="/products">الهواتف</Link><Link href="/#brands">الماركات</Link><Link href="/#about">Louay Phone</Link></nav><Link href="/products" className="nav-cta">كل الهواتف</Link></div></header>
      <section className="product-detail"><div className="container"><div className="product-detail__crumb"><Link href="/products">الهواتف</Link><span>›</span><span>{product.brand}</span><span>›</span><strong>{product.name}</strong></div><div className="product-detail__grid"><ProductGallery name={product.name} images={product.images} /><div className="product-detail__copy"><div className="eyebrow">{product.brand}</div><h1>{product.name}</h1>{product.model && <p className="product-detail__model">{product.model}</p>}<div className="product-detail__price">{formatUsd(product.price_usd)}{product.price_syp != null ? <small>{new Intl.NumberFormat('en-US').format(Number(product.price_syp))} ل.س</small> : null}</div><div className={`product-detail__stock ${product.stock_status === 'out_of_stock' ? 'product-detail__stock--out' : ''}`}>{product.stock_status === 'out_of_stock' ? 'غير متوفر حاليًا' : 'متوفر للطلب'}</div>{product.installment_enabled && <div className="product-detail__installment">يتوفر لهذا المنتج خيار التقسيط.</div>}<div className="product-detail__actions"><Link href={`/product/${product.slug}#order`} className="btn btn--dark">اطلب الآن</Link><Link href="/products" className="btn btn--link">العودة للهواتف</Link></div>{product.description && <div className="product-detail__description"><h2>عن المنتج</h2><p>{product.description}</p></div>}</div></div></div></section>
      <section className="section section--gray" id="specs"><div className="container"><header className="section__head"><div className="eyebrow">SPECIFICATIONS</div><h2 className="section__title">المواصفات.</h2></header>{specEntries.length ? <div className="spec-grid">{specEntries.map(([key, value]) => <div className="spec-card" key={key}><span>{titleCase(key)}</span><strong>{String(value)}</strong></div>)}</div> : <div className="empty-state"><h2>المواصفات قيد الإضافة.</h2><p>سيظهر هذا القسم تلقائيًا عند إدخال المواصفات من الإدارة.</p></div>}</div></section>
      {related.length > 0 && <section className="section"><div className="container"><header className="section__head"><div className="eyebrow">YOU MAY ALSO LIKE</div><h2 className="section__title">من نفس الماركة.</h2></header><div className="lineup">{related.map((item) => <article className="product-card" key={item.id}><div><div className="product-card__top"><span className="product-card__brand">{item.brand}</span><span className="product-card__badge">متوفر</span></div><div className="product-card__image"><img src={primaryImage(item)!} alt={item.name} loading="lazy" /></div></div><div className="product-card__copy"><h3>{item.name}</h3><p>{item.model ?? 'منتج من نفس العائلة.'}</p><div className="price">{formatUsd(item.price_usd)}</div><div className="product-card__actions"><Link href={`/product/${item.slug}`} className="btn btn--dark">معرفة المزيد</Link></div></div></article>)}</div></div></section>}
      <section className="final-cta" id="order"><div className="container"><div className="eyebrow">LOUAY PHONE</div><h2>جاهز للطلب؟</h2><p>تواصل معنا لبدء الطلب والتأكد من التوفر والسعر الحالي.</p><div className="actions"><Link href="/#about" className="btn btn--dark">تواصل معنا</Link><Link href="/products" className="btn btn--link">العودة للكتالوج</Link></div></div></section>
    </main>
  );
}

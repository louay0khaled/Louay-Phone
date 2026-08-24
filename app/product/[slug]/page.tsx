import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductGallery from '@/app/components/ProductGallery';
import OrderForm from '@/app/components/OrderForm';
import ReviewForm from '@/app/components/ReviewForm';
import { getSupabase } from '@/lib/supabase';
import { formatUsd, getActiveProducts, getProductBySlug, primaryImage } from '@/lib/products';

export const revalidate = 60;
const getProduct = cache((slug: string) => getProductBySlug(slug));
const SITE_URL = 'https://louay-phone.vercel.app';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'المنتج غير موجود' };
  const description = product.description?.slice(0, 155) || `${product.name} من ${product.brand ?? 'Louay Phone'} — السعر والمواصفات والتوفر.`;
  const image = primaryImage(product);
  const url = `${SITE_URL}/product/${product.slug}`;
  return { title: `${product.name}${product.model ? ` ${product.model}` : ''}`, description, alternates: { canonical: url }, openGraph: { type: 'website', title: `${product.name} | Louay Phone`, description, url, ...(image ? { images: [{ url: image, alt: product.name }] } : {}) } };
}

function titleCase(key: string) { return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function isDisplayableValue(value: unknown) { return value !== null && value !== undefined && value !== '' && typeof value !== 'object'; }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const related = (await getActiveProducts(12)).filter((item) => item.id !== product.id && item.brand_id === product.brand_id && primaryImage(item)).slice(0, 3);
  const specEntries = Object.entries(product.specs ?? {}).filter(([, value]) => isDisplayableValue(value)).slice(0, 30);
  const supabase = getSupabase();
  const [reviewResult, planResult] = await Promise.all([
    supabase ? supabase.from('reviews').select('id,customer_name,rating,comment,created_at').eq('product_id', product.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [], error: null }),
    supabase ? supabase.from('installment_plans').select('id,months,first_payment_type,first_payment_value,total_price,monthly_amount').eq('product_id', product.id).eq('is_active', true).order('months', { ascending: true }).limit(3) : Promise.resolve({ data: [], error: null }),
  ]);
  const reviews = (reviewResult.data ?? []) as { id:string; customer_name:string; rating:number; comment:string|null; created_at:string }[];
  const plans = (planResult.data ?? []) as { id:string; months:number; first_payment_type:string; first_payment_value:number; total_price:number|null; monthly_amount:number|null }[];
  const image = primaryImage(product);
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, brand: { '@type': 'Brand', name: product.brand ?? 'Louay Phone' }, sku: product.id, image: image ? [image] : [], description: product.description ?? undefined, aggregateRating: averageRating ? { '@type': 'AggregateRating', ratingValue: averageRating.toFixed(1), reviewCount: reviews.length } : undefined, offers: product.price_usd != null ? { '@type': 'Offer', priceCurrency: 'USD', price: Number(product.price_usd), availability: product.stock_status === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: `${SITE_URL}/product/${product.slug}` } : undefined };

  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="announcement">Louay Phone — تفاصيل المنتج</div>
    <header className="site-nav"><div className="container site-nav__row"><Link href="/" className="brand">Louay <span>Phone</span></Link><nav className="nav-links" aria-label="التنقل الرئيسي"><Link href="/products">الهواتف</Link><Link href="/#brands">الماركات</Link><Link href="/#about">Louay Phone</Link></nav><Link href="/products" className="nav-cta">كل الهواتف</Link></div></header>
    <section className="product-detail"><div className="container"><div className="product-detail__crumb"><Link href="/products">الهواتف</Link><span>›</span><span>{product.brand}</span><span>›</span><strong>{product.name}</strong></div><div className="product-detail__grid"><ProductGallery name={product.name} images={product.images} /><div className="product-detail__copy"><div className="eyebrow">{product.brand}</div><h1>{product.name}</h1>{product.model && <p className="product-detail__model">{product.model}</p>}<div className="product-detail__price">{formatUsd(product.price_usd)}{product.price_syp != null ? <small>{new Intl.NumberFormat('en-US').format(Number(product.price_syp))} ل.س</small> : null}</div><div className={`product-detail__stock ${product.stock_status === 'out_of_stock' ? 'product-detail__stock--out' : ''}`}>{product.stock_status === 'out_of_stock' ? 'غير متوفر حاليًا' : 'متوفر للطلب'}</div>{plans.length>0&&<div className="plan-list">{plans.map(pl=><div className="plan-card" key={pl.id}><strong>{pl.months} شهر</strong><span>دفعة أولى: {pl.first_payment_type==='percentage'?`${pl.first_payment_value}%`:pl.first_payment_value}</span><span>شهري: {pl.monthly_amount??'—'}</span></div>)}</div>}{product.installment_enabled&&plans.length===0&&<div className="product-detail__installment">يتوفر لهذا المنتج خيار التقسيط.</div>}<div className="product-detail__actions"><Link href={`/product/${product.slug}#order`} className="btn btn--dark">اطلب الآن</Link><Link href={`/chat?product=${encodeURIComponent(product.name)}`} className="btn btn--link">اسأل عن هذا الهاتف</Link><Link href="/products" className="btn btn--link">العودة للهواتف</Link></div>{product.description&&<div className="product-detail__description"><h2>عن المنتج</h2><p>{product.description}</p></div>}</div></div></div></section>
    <section className="section section--gray" id="specs"><div className="container"><header className="section__head"><div className="eyebrow">SPECIFICATIONS</div><h2 className="section__title">المواصفات.</h2></header>{specEntries.length?<div className="spec-grid">{specEntries.map(([key,value])=><div className="spec-card" key={key}><span>{titleCase(key)}</span><strong>{String(value)}</strong></div>)}</div>:<div className="empty-state"><h2>المواصفات قيد الإضافة.</h2><p>سيظهر هذا القسم تلقائيًا عند إدخال المواصفات من الإدارة.</p></div>}</div></section>
    <section className="section reviews-section" id="reviews"><div className="container"><header className="section__head"><div className="eyebrow">CUSTOMER REVIEWS</div><h2 className="section__title">آراء العملاء.</h2>{averageRating&&<p className="section__lead">متوسط التقييم {averageRating.toFixed(1)} / 5 من {reviews.length} تقييمات معتمدة.</p>}</header>{reviews.length?<div className="review-list">{reviews.map(r=><article className="review-card" key={r.id}><div className="review-card__head"><span className="review-card__name">{r.customer_name}</span><span className="review-card__stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span></div>{r.comment&&<p>{r.comment}</p>}</article>)}</div>:<div className="empty-state"><h2>كن أول من يقيّم هذا الهاتف.</h2><p>ستظهر التقييمات هنا بعد اعتمادها من الإدارة.</p></div>}<div className="review-submit"><div className="eyebrow">VERIFIED BUYER</div><h3>اشتريت هذا الهاتف؟ شاركنا رأيك.</h3><p>التقييم مرتبط برقم الطلب ولا يظهر للعامة إلا بعد اعتماده.</p><ReviewForm productId={product.id} /></div></div></section>
    {related.length>0&&<section className="section"><div className="container"><header className="section__head"><div className="eyebrow">YOU MAY ALSO LIKE</div><h2 className="section__title">من نفس الماركة.</h2></header><div className="lineup">{related.map((item)=><article className="product-card" key={item.id}><div><div className="product-card__top"><span className="product-card__brand">{item.brand}</span><span className="product-card__badge">متوفر</span></div><div className="product-card__image"><img src={primaryImage(item)!} alt={item.name} loading="lazy" decoding="async" /></div></div><div className="product-card__copy"><h3>{item.name}</h3><p>{item.model??'منتج من نفس العائلة.'}</p><div className="price">{formatUsd(item.price_usd)}</div><div className="product-card__actions"><Link href={`/product/${item.slug}`} className="btn btn--dark">معرفة المزيد</Link></div></div></article>)}</div></div></section>}
    <section className="section section--gray" id="order"><div className="container order-layout"><div><div className="eyebrow">ORDER</div><h2 className="section__title">جاهز للطلب؟</h2><p className="section__lead">أرسل بياناتك، وسنراجع التوفر ونؤكد الطلب معك.</p><Link href={`/chat?product=${encodeURIComponent(product.name)}`} className="btn btn--link">تفضّل المحادثة بدل الطلب؟</Link></div><OrderForm productId={product.id} installmentPlans={plans}/></div></section>
    <section className="final-cta"><div className="container"><div className="eyebrow">LOUAY PHONE</div><h2>اختيار أبسط.<br/>قرار أفضل.</h2><div className="actions"><Link href="/products" className="btn btn--dark">العودة للكتالوج</Link><Link href="/chat" className="btn btn--link">تواصل معنا</Link></div></div></section>
  </main>;
}

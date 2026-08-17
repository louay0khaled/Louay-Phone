'use client';

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

function ProductPrice({ product, exchangeRate }: { product: Product; exchangeRate: unknown }) {
  const price = currentSyp(product.price_usd, product.price_syp, exchangeRate);
  return (
    <div className="premium-price">
      <span>السعر الحالي</span>
      <strong>{price ? `${price.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</strong>
      {product.price_usd ? <small>${Number(product.price_usd).toLocaleString('en-US')}</small> : null}
    </div>
  );
}

export default function HomeStorefront({ data }: { data: HomeData }) {
  const featured = data.products.slice(0, 6);
  const hero = featured[0];
  const heroImage = hero?.product_images?.find((item) => item.is_primary) ?? hero?.product_images?.[0];
  const secondaries = featured.slice(1, 4);

  return (
    <main className="premium-home">
      <StoreHeader />

      <section className="premium-hero">
        <div className="premium-hero__copy">
          <p className="premium-eyebrow">LOUAY PHONE · PREMIUM SMARTPHONES</p>
          <h1>اختَر هاتفك.<br /><span>وخليه الاختيار الصح.</span></h1>
          <p className="premium-hero__lead">هواتف متوفرة فعليًا، أسعار واضحة، مواصفات دقيقة، وطلب مباشر بدون ما نضيّع وقتك بين عشرات الخطوات.</p>
          <div className="premium-actions">
            <Link href="/products" className="premium-btn premium-btn--solid">استكشف الهواتف <span aria-hidden>←</span></Link>
            <Link href="#featured" className="premium-btn premium-btn--quiet">شاهد المختارات</Link>
          </div>
          <div className="premium-proof" aria-label="مزايا المتجر">
            <span>منتجات فعلية</span><i />
            <span>طلب مباشر</span><i />
            <span>دعم سريع</span>
          </div>
        </div>

        <div className="premium-hero__visual">
          <div className="premium-hero__halo" aria-hidden />
          <div className="premium-hero__product">
            {heroImage?.url ? (
              <Image src={heroImage.url} alt={heroImage.alt_text ?? hero?.name ?? 'هاتف'} fill priority sizes="(max-width: 768px) 92vw, 55vw" className="premium-hero__image" />
            ) : (
              <div className="premium-hero__fallback">أضف صورة المنتج من لوحة الإدارة</div>
            )}
          </div>
          {hero ? (
            <Link href={`/product/${hero.slug}`} className="premium-hero__caption">
              <div>
                <span>{hero.brands?.name ?? 'Louay Phone'}</span>
                <b>{hero.name}</b>
              </div>
              <ProductPrice product={hero} exchangeRate={data.exchangeRate} />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="premium-strip" aria-label="معلومات المتجر">
        <div><b>{data.productCount ? `+${data.productCount.toLocaleString('ar-SY')}` : '—'}</b><span>منتج في الكتالوج</span></div>
        <div><b>{data.brandCount ? `+${data.brandCount.toLocaleString('ar-SY')}` : '—'}</b><span>علامة متوفرة</span></div>
        <div><b>{data.reviewCount ? data.avgRating.toFixed(1) : '—'}</b><span>{data.reviewCount ? 'متوسط التقييم' : 'بانتظار تقييماتك'}</span></div>
        <div><b>01</b><span>طلب مباشر من صفحة المنتج</span></div>
      </section>

      <section id="featured" className="premium-section">
        <div className="premium-section__head">
          <div>
            <p className="premium-eyebrow">THE COLLECTION</p>
            <h2>مختارات تستحق.</h2>
          </div>
          <Link href="/products" className="premium-text-link">عرض الكتالوج كاملًا <span aria-hidden>←</span></Link>
        </div>
        <div className="premium-products">
          {secondaries.map((product) => {
            const image = product.product_images?.find((item) => item.is_primary) ?? product.product_images?.[0];
            return (
              <Link href={`/product/${product.slug}`} key={product.id} className="premium-product-card">
                <div className="premium-product-card__media">
                  {image?.url ? <Image src={image.url} alt={image.alt_text ?? product.name} fill sizes="(max-width: 700px) 100vw, 33vw" className="premium-product-card__image" /> : <span>لا توجد صورة</span>}
                  <span className="premium-product-card__brand">{product.brands?.name ?? 'Louay Phone'}</span>
                </div>
                <div className="premium-product-card__body">
                  <div><h3>{product.name}</h3>{product.model ? <p>{product.model}</p> : null}</div>
                  <ProductPrice product={product} exchangeRate={data.exchangeRate} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="premium-story">
        <div className="premium-story__copy">
          <p className="premium-eyebrow">SHOP WITH CONFIDENCE</p>
          <h2>المتجر اللي يخليك تحكم على المنتج قبل ما تطلبه.</h2>
          <p>بدل الكلام التسويقي الزائد، نضع أمامك المنتج الحقيقي ومواصفاته وسعره وتوفره، ثم نختصر قرار الشراء في خطوة واضحة.</p>
          <Link href="/products" className="premium-btn premium-btn--solid">ابدأ الاختيار</Link>
        </div>
        <div className="premium-story__grid">
          {[
            ['01', 'منتجات حقيقية', 'المختارات تُسحب من مخزون المتجر الفعلي.'],
            ['02', 'صفحة منتج واضحة', 'المعلومات والسعر والطلب في مكان واحد.'],
            ['03', 'شراء بدون احتكاك', 'لا تسجيل إجباري ولا خطوات مشتتة.'],
            ['04', 'مساعدة عند الحاجة', 'المحادثة موجودة عندما تحتاج رأيًا أو مساعدة.'],
          ].map(([num, title, text]) => (
            <div className="premium-principle" key={num}>
              <span>{num}</span><h3>{title}</h3><p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-bottom">
        <p className="premium-eyebrow">LOUAY PHONE</p>
        <h2>Less noise.<br />Better choice.</h2>
        <Link href="/products" className="premium-btn premium-btn--solid">تسوّق الهواتف <span aria-hidden>←</span></Link>
      </section>
    </main>
  );
}

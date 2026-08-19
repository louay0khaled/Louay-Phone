import Link from 'next/link';
import { formatUsd, getActiveProducts, primaryImage } from '@/lib/products';

export const dynamic = 'force-dynamic';

const blockedTerms = ['pad', 'tab', 'tablet', 'cover', 'case', 'charger', 'watch', 'band', 'earbuds', 'buds'];

function isPhone(product: Awaited<ReturnType<typeof getActiveProducts>>[number]) {
  const text = `${product.name} ${product.model ?? ''} ${product.brand ?? ''}`.toLowerCase();
  return !blockedTerms.some((term) => text.includes(term));
}

function ProductCard({ product }: { product: Awaited<ReturnType<typeof getActiveProducts>>[number] }) {
  const src = primaryImage(product);
  return (
    <article className="product-card">
      <div>
        <div className="product-card__top"><span className="product-card__brand">{product.brand}</span><span className="product-card__badge">{product.stock_status === 'out_of_stock' ? 'غير متوفر' : 'متوفر'}</span></div>
        <div className="product-card__image">
          {src ? <img src={src} alt={product.images[0]?.alt_text ?? product.name} loading="lazy" /> : <div className="product-card__placeholder">الصورة قيد الإضافة</div>}
        </div>
      </div>
      <div className="product-card__copy">
        <h3>{product.name}</h3>
        <p>{product.model ?? 'اختيار مميز من Louay Phone.'}</p>
        <div className="price">{formatUsd(product.price_usd)}{product.installment_enabled ? <small>يتوفر خيار التقسيط</small> : null}</div>
        <div className="product-card__actions"><Link href={`/product/${product.slug}`} className="btn btn--dark">معرفة المزيد</Link><Link href={`/product/${product.slug}`} className="btn btn--link">اطلب الآن</Link></div>
      </div>
    </article>
  );
}

export default async function ProductsPage() {
  const products = (await getActiveProducts(120)).filter(isPhone);
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

  return (
    <main>
      <div className="announcement">Louay Phone — كتالوج الهواتف</div>
      <header className="site-nav"><div className="container site-nav__row"><Link href="/" className="brand">Louay <span>Phone</span></Link><nav className="nav-links" aria-label="التنقل الرئيسي"><Link href="/products">الهواتف</Link><Link href="/#brands">الماركات</Link><Link href="/#about">Louay Phone</Link></nav><Link href="/" className="nav-cta">الرئيسية</Link></div></header>
      <section className="section section--gray">
        <div className="container">
          <header className="section__head"><div className="eyebrow">SMARTPHONE CATALOG</div><h1 className="section__title">كل الهواتف.</h1><p className="section__lead">ابحث ضمن المنتجات الحقيقية الموجودة في المتجر، مع الأسعار والتوفر والصور الحالية.</p></header>
          <div className="catalog-toolbar" aria-label="أدوات البحث والفلترة">
            <form className="catalog-search" action="/products" method="get"><input name="q" placeholder="ابحث عن هاتف أو ماركة…" aria-label="ابحث عن هاتف أو ماركة"/><button className="btn btn--dark" type="submit">بحث</button></form>
            <div className="catalog-brands"><span>الماركات:</span>{brands.slice(0, 10).map((brand) => <span key={brand} className="catalog-chip">{brand}</span>)}</div>
          </div>
          {products.length ? <div className="lineup">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>ما لقينا منتجات مطابقة.</h2><p>جرّب كلمة بحث مختلفة.</p></div>}
        </div>
      </section>
    </main>
  );
}

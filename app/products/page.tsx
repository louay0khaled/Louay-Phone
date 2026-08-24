import Image from 'next/image';
import Link from 'next/link';
import { formatUsd, getActiveProducts, primaryImage } from '@/lib/products';

export const dynamic = 'force-dynamic';

const SUPABASE_ORIGIN = 'https://gmpogiiqydoxoclxcvwh.supabase.co';
type Product = Awaited<ReturnType<typeof getActiveProducts>>[number];
type SearchParams = Promise<{ q?: string; brand?: string; page?: string; type?: string }>;

function classify(product: Product) {
  const text = `${product.name} ${product.model ?? ''}`.toLowerCase();
  if (/pad|tab|tablet|matepad/.test(text)) return 'tablet';
  if (/cover|case|charger|watch|band|earbuds|buds/.test(text)) return 'accessory';
  if (/n\s?\d+|b\d+|nokia|3310|105|106|110|125|150/.test(text)) return 'feature-phone';
  return 'phone';
}

function isSupabaseImage(url: string) {
  try { return new URL(url).origin === SUPABASE_ORIGIN; } catch { return false; }
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  return isSupabaseImage(src)
    ? <Image src={src} alt={alt} width={800} height={800} sizes="(max-width: 700px) 100vw, 33vw" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    : <img src={src} alt={alt} loading="lazy" />;
}

function ProductCard({ product }: { product: Product }) {
  const src = primaryImage(product);
  return <article className="product-card">
    <div>
      <div className="product-card__top">
        <span className="product-card__brand">{product.brand}</span>
        <span className="product-card__badge">{product.stock_status === 'out_of_stock' ? 'غير متوفر' : 'متوفر'}</span>
      </div>
      <div className="product-card__image">
        {src ? <ProductImage src={src} alt={product.images[0]?.alt_text ?? product.name} /> : <div className="product-card__placeholder">الصورة قيد الإضافة</div>}
      </div>
    </div>
    <div className="product-card__copy">
      <h3>{product.name}</h3>
      <p>{product.model ?? 'تفاصيل المنتج قيد الإضافة.'}</p>
      <div className="price">{formatUsd(product.price_usd)}{product.installment_enabled ? <small>يتوفر خيار التقسيط</small> : null}</div>
      <div className="product-card__actions">
        <Link href={`/product/${product.slug}`} className="btn btn--dark">معرفة المزيد</Link>
        <Link href={`/product/${product.slug}#order`} className="btn btn--link">اطلب الآن</Link>
      </div>
    </div>
  </article>;
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q ?? '').trim().toLowerCase();
  const selectedBrand = (params.brand ?? '').trim();
  const selectedType = params.type === 'tablet' || params.type === 'accessory' || params.type === 'feature-phone' ? params.type : 'all';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const pageSize = 24;

  const allProducts = await getActiveProducts(200);
  const brands = [...new Set(allProducts.map((p) => p.brand).filter(Boolean))] as string[];
  const filteredProducts = allProducts.filter((product) => {
    const haystack = `${product.name} ${product.model ?? ''} ${product.brand ?? ''}`.toLowerCase();
    const matchesSearch = !q || haystack.includes(q);
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;
    const matchesType = selectedType === 'all' || classify(product) === selectedType;
    return matchesSearch && matchesBrand && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const products = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  const makeUrl = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set('q', params.q ?? '');
    if (selectedBrand) search.set('brand', selectedBrand);
    if (selectedType !== 'all') search.set('type', selectedType);
    if (nextPage > 1) search.set('page', String(nextPage));
    const value = search.toString();
    return value ? `/products?${value}` : '/products';
  };

  return <main>
    <div className="announcement">Louay Phone — كتالوج المتجر الكامل</div>
    <header className="site-nav"><div className="container site-nav__row"><Link href="/" className="brand">Louay <span>Phone</span></Link><nav className="nav-links" aria-label="التنقل الرئيسي"><Link href="/products">المنتجات</Link><Link href="/#brands">الماركات</Link><Link href="/#about">Louay Phone</Link></nav><Link href="/" className="nav-cta">الرئيسية</Link></div></header>
    <section className="section section--gray">
      <div className="container">
        <header className="section__head"><div className="eyebrow">FULL CATALOG</div><h1 className="section__title">كل منتجات المتجر.</h1><p className="section__lead">لا نخفي أي منتج فعّال. يمكنك البحث والتصفية، وستظهر المنتجات التي لا تملك صورًا مع تنبيه واضح بدل اختفائها.</p></header>
        <div className="catalog-toolbar" aria-label="أدوات البحث والفلترة">
          <form className="catalog-search" action="/products" method="get"><input name="q" defaultValue={params.q ?? ''} placeholder="ابحث عن هاتف، موديل أو ماركة…" aria-label="ابحث عن هاتف أو موديل أو ماركة" />{selectedBrand && <input type="hidden" name="brand" value={selectedBrand} />}{selectedType !== 'all' && <input type="hidden" name="type" value={selectedType} />}<button className="btn btn--dark" type="submit">بحث</button></form>
          <div className="catalog-brands"><span>النوع:</span><Link className={`catalog-chip${selectedType === 'all' ? ' catalog-chip--active' : ''}`} href={makeUrl(1)}>الكل</Link><Link className={`catalog-chip${selectedType === 'phone' ? ' catalog-chip--active' : ''}`} href="/products?type=phone">الهواتف الذكية</Link><Link className={`catalog-chip${selectedType === 'feature-phone' ? ' catalog-chip--active' : ''}`} href="/products?type=feature-phone">الهواتف التقليدية</Link><Link className={`catalog-chip${selectedType === 'tablet' ? ' catalog-chip--active' : ''}`} href="/products?type=tablet">الأجهزة اللوحية</Link><Link className={`catalog-chip${selectedType === 'accessory' ? ' catalog-chip--active' : ''}`} href="/products?type=accessory">الإكسسوارات</Link></div>
          <div className="catalog-brands"><span>الماركات:</span><Link className={`catalog-chip${!selectedBrand ? ' catalog-chip--active' : ''}`} href={makeUrl(1)}>الكل</Link>{brands.slice(0, 14).map((brand) => <Link key={brand} className={`catalog-chip${brand === selectedBrand ? ' catalog-chip--active' : ''}`} href={`/products?brand=${encodeURIComponent(brand)}`}>{brand}</Link>)}</div>
        </div>
        <div className="catalog-result-count">{filteredProducts.length} منتج · الصفحة {safePage} من {totalPages}</div>
        {products.length ? <div className="lineup">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>ما لقينا منتجات مطابقة.</h2><p>جرّب كلمة بحث مختلفة أو أزل الفلاتر.</p><Link className="btn btn--dark" href="/products">إظهار كل المنتجات</Link></div>}
        {totalPages > 1 && <nav className="catalog-pagination" aria-label="صفحات المنتجات"><Link className={`catalog-chip${safePage === 1 ? ' catalog-chip--disabled' : ''}`} href={makeUrl(Math.max(1, safePage - 1))}>السابق</Link><span>{safePage} / {totalPages}</span><Link className={`catalog-chip${safePage === totalPages ? ' catalog-chip--disabled' : ''}`} href={makeUrl(Math.min(totalPages, safePage + 1))}>التالي</Link></nav>}
      </div>
    </section>
  </main>;
}

import Image from 'next/image';
import Link from 'next/link';
import MobileHomeMenu from '@/app/components/MobileHomeMenu';
import { getActiveProducts, getHomepageShowcase, getProductsByIds, getSiteAssets, primaryImage, type Product } from '@/lib/products';

export const dynamic = 'force-dynamic';

const SUPABASE_ORIGIN = 'https://gmpogiiqydoxoclxcvwh.supabase.co';
const nonSmartphoneTerms = ['pad', 'tab', 'tablet', 'cover', 'case', 'charger', 'watch', 'band', 'earbuds', 'buds'];
function isSmartphone(product: Product) {
  const text = `${product.name} ${product.model ?? ''} ${product.brand ?? ''}`.toLowerCase();
  return !nonSmartphoneTerms.some((term) => text.includes(term));
}
function rankProduct(product: Product) {
  let score = 0;
  if (product.is_featured) score += 1000;
  if (primaryImage(product)) score += 400;
  if (product.stock_status === 'in_stock') score += 100;
  if (product.price_usd != null) score += 50;
  return score;
}
function money(product: Product) {
  if (product.price_usd == null) return 'السعر عند الطلب';
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(product.price_usd))}`;
}
function assetMap(assets: Awaited<ReturnType<typeof getSiteAssets>>) { return new Map(assets.map((asset) => [asset.key, asset.url])); }
function isSupabaseImage(url: string) { try { return new URL(url).origin === SUPABASE_ORIGIN; } catch { return false; } }

function StoreImage({ src, alt, className, priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  if (isSupabaseImage(src)) return <Image src={src} alt={alt} width={1200} height={1200} className={className} priority={priority} sizes="(max-width: 768px) 100vw, 70vw" />;
  return <img src={src} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />;
}

function ProductCard({ product }: { product: Product }) {
  const src = primaryImage(product);
  return <article className="product-card">
    <div>
      <div className="product-card__top"><span className="product-card__brand">{product.brand}</span><span className="product-card__badge">{product.stock_status === 'out_of_stock' ? 'غير متوفر' : 'متوفر'}</span></div>
      <div className="product-card__image">{src ? <StoreImage src={src} alt={product.images[0]?.alt_text ?? product.name} /> : <div className="product-card__placeholder">الصورة قيد الإضافة</div>}</div>
    </div>
    <div className="product-card__copy"><h3>{product.name}</h3><p>{product.model ?? 'تفاصيل المنتج قيد الإضافة.'}</p><div className="price">{money(product)}{product.installment_enabled ? <small>يتوفر خيار التقسيط</small> : null}</div><div className="product-card__actions"><Link href={`/product/${product.slug}`} className="btn btn--dark">معرفة المزيد</Link><Link href={`/product/${product.slug}#order`} className="btn btn--link">اطلب الآن</Link></div></div>
  </article>;
}

export default async function HomePage() {
  const showcase = await getHomepageShowcase();
  const selectedIds = [showcase.hero_product_id ?? '', ...(showcase.featured_product_ids ?? [])].filter(Boolean);
  const [products, selectedProducts, assets] = await Promise.all([
    getActiveProducts(80),
    getProductsByIds(selectedIds),
    getSiteAssets(),
  ]);

  const mergedProducts = new Map(products.map((product) => [product.id, product]));
  for (const product of selectedProducts) mergedProducts.set(product.id, product);
  const smartphones = [...mergedProducts.values()].filter(isSmartphone);
  const smartphoneMap = new Map(smartphones.map((product) => [product.id, product]));
  const configuredHero = showcase.hero_product_id ? smartphoneMap.get(showcase.hero_product_id) : undefined;
  const configuredFeatured = (showcase.featured_product_ids ?? []).map((id) => smartphoneMap.get(id)).filter((product): product is Product => Boolean(product));
  const fallbackFeatured = smartphones.filter((product) => product.is_featured).sort((a, b) => rankProduct(b) - rankProduct(a));
  const imagePool = smartphones.filter((product) => primaryImage(product)).sort((a, b) => rankProduct(b) - rankProduct(a));
  const hero = configuredHero && primaryImage(configuredHero) ? configuredHero : configuredFeatured.find((product) => primaryImage(product)) ?? fallbackFeatured.find((product) => primaryImage(product)) ?? imagePool[0] ?? smartphones[0];

  if (!hero) return <main className="final-cta"><div className="container"><div className="eyebrow">LOUAY PHONE</div><h1>المتجر قيد التجهيز.</h1><p>سيظهر محتوى الصفحة الرئيسية تلقائيًا عند توفر المنتجات في قاعدة البيانات.</p></div></main>;

  const chosenFeatured = configuredFeatured.length ? configuredFeatured : fallbackFeatured.filter((product) => product.id !== hero.id);
  const lineup = [...chosenFeatured, ...imagePool.filter((product) => product.id !== hero.id && !chosenFeatured.some((item) => item.id === product.id))].slice(0, 6);
  const seenBrands = new Set<string>();
  const uniqueBrands = smartphones.filter((product) => product.brand && !seenBrands.has(product.brand) && seenBrands.add(product.brand)).slice(0, 8);
  const assetsByKey = assetMap(assets);
  const logoAsset = assetsByKey.get('logo');

  return <main>
    <div className="announcement">تسوّق أحدث الهواتف من Louay Phone — <Link href="/products">شاهد الكتالوج الكامل</Link></div>
    <header className="site-nav"><div className="container site-nav__row"><Link href="/" className="brand">{logoAsset ? <img src={logoAsset} alt="Louay Phone" style={{ height: 28, width: 'auto', objectFit: 'contain' }} /> : <>Louay <span>Phone</span></>}</Link><nav className="nav-links" aria-label="التنقل الرئيسي"><Link href="#lineup">المميز</Link><Link href="#brands">الماركات</Link><Link href="/products">كل المنتجات</Link><Link href="#about">عن المتجر</Link></nav><Link href="/products" className="nav-cta">تسوّق الآن</Link><MobileHomeMenu /></div></header>

    <section className="hero"><div className="container hero__inner"><div className="eyebrow" style={{ color: '#a1a1a6' }}>{hero.brand ?? 'LOUAY PHONE'}</div><h1 className="hero__title">{hero.name}</h1><p className="hero__subtitle">الموديل {hero.model ?? '—'} · {money(hero)}</p><div className="actions"><Link href={`/product/${hero.slug}`} className="btn btn--primary">معرفة المزيد</Link><Link href="/products" className="btn btn--link" style={{ color: '#2997ff' }}>كل الهواتف</Link></div><div className="hero__image-wrap">{primaryImage(hero) ? <StoreImage className="hero__image" src={primaryImage(hero)!} alt={hero.images[0]?.alt_text ?? hero.name} priority /> : <div className="hero__placeholder">الصورة قيد الإضافة</div>}</div></div></section>

    <section id="lineup" className="section section--gray"><div className="container"><header className="section__head"><div className="eyebrow">FEATURED PHONES</div><h2 className="section__title">هواتفك المميزة.</h2><p className="section__lead">هذه المجموعة مرتبطة مباشرة باختيار الإدارة من قاعدة البيانات. ويمكن رؤية كل المنتجات من الكتالوج.</p></header><div className="lineup">{lineup.length ? lineup.map((product) => <ProductCard key={product.id} product={product} />) : <ProductCard product={hero} />}</div></div></section>

    <section id="brands" className="section section--gray"><div className="container"><header className="section__head"><div className="eyebrow">BRANDS</div><h2 className="section__title">الماركات.</h2><p className="section__lead">الماركات مأخوذة مباشرة من المنتجات الفعالة في المتجر.</p></header><div className="brand-strip">{uniqueBrands.map((product) => <Link key={product.brand} href={`/products?brand=${encodeURIComponent(product.brand ?? '')}`} className="brand-tile">{assetsByKey.get(`brand:${product.brand_id}`) ? <img src={assetsByKey.get(`brand:${product.brand_id}`)!} alt={product.brand!} loading="lazy" /> : <span>{product.brand}</span>}<small>استكشف</small></Link>)}</div></div></section>

    <section id="about" className="final-cta"><div className="container"><div className="eyebrow">LOUAY PHONE</div><h2>كل منتجاتك.<br />بتجربة أوضح.</h2><p>تصفح الكتالوج الكامل، ابحث حسب الاسم أو الماركة، واطلب المنتج مباشرة من صفحة تفاصيله.</p><div className="actions"><Link href="/products" className="btn btn--dark">فتح الكتالوج</Link><Link href="/chat" className="btn btn--link">تواصل مع الدعم</Link></div></div></section>
    <footer className="footer-lite"><div className="container footer-lite__row"><span>© {new Date().getFullYear()} Louay Phone</span><span>متجر الهواتف الذكية</span></div></footer>
  </main>;
}

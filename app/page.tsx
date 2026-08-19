import Link from 'next/link';
import MobileHomeMenu from '@/app/components/MobileHomeMenu';
import { getActiveProducts, getHomepageShowcase, getSiteAssets, primaryImage, type Product } from '@/lib/products';

export const dynamic = 'force-dynamic';

const blockedTerms = ['pad', 'tab', 'tablet', 'cover', 'case', 'charger', 'watch', 'band', 'earbuds', 'buds'];
function isPhoneProduct(product: Product) { const text = `${product.name} ${product.model ?? ''} ${product.brand ?? ''}`.toLowerCase(); return !blockedTerms.some((term) => text.includes(term)); }
function rankProduct(product: Product) { let score = 0; if (product.is_featured) score += 1000; if (primaryImage(product)) score += 400; if (product.stock_status === 'in_stock') score += 100; if (product.price_usd != null) score += 50; return score; }
function money(product: Product) { if (product.price_usd == null) return 'السعر عند الطلب'; return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(product.price_usd))}`; }
function assetMap(assets: Awaited<ReturnType<typeof getSiteAssets>>) { return new Map(assets.map((asset) => [asset.key, asset.url])); }

function ProductCard({ product }: { product: Product }) { const src = primaryImage(product); return <article className="product-card"><div><div className="product-card__top"><span className="product-card__brand">{product.brand}</span><span className="product-card__badge">{product.stock_status === 'out_of_stock' ? 'غير متوفر' : 'متوفر'}</span></div><div className="product-card__image">{src ? <img src={src} alt={product.images[0]?.alt_text ?? product.name} loading="lazy" /> : <div className="product-card__placeholder">الصورة قيد الإضافة</div>}</div></div><div className="product-card__copy"><h3>{product.name}</h3><p>{product.model ?? 'اختيار مميز من Louay Phone.'}</p><div className="price">{money(product)}{product.installment_enabled ? <small>يتوفر خيار التقسيط</small> : null}</div><div className="product-card__actions"><Link href={`/product/${product.slug}`} className="btn btn--dark">معرفة المزيد</Link><Link href={`/product/${product.slug}#order`} className="btn btn--link">اطلب الآن</Link></div></div></article>; }

function FeatureBand({ product, title, text, light = false }: { product: Product; title: string; text: string; light?: boolean }) { const src = primaryImage(product); return <section className={`feature-band${light ? ' feature-band--light' : ''}`}><div className="feature-band__copy"><div className="eyebrow">{product.brand}</div><h2>{title}</h2><p>{text}</p><div className="actions" style={{ justifyContent: 'flex-start' }}><Link href={`/product/${product.slug}`} className={light ? 'btn btn--dark' : 'btn btn--primary'}>اكتشف الهاتف</Link></div></div><div className="feature-band__media">{src ? <img src={src} alt={product.name} loading="lazy" /> : <span className="feature-band__placeholder">الصورة قيد الإضافة</span>}</div></section>; }

export default async function HomePage() {
  const [products, showcase, assets] = await Promise.all([getActiveProducts(120), getHomepageShowcase(), getSiteAssets()]);
  const phoneProducts = products.filter(isPhoneProduct);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const phoneMap = new Map(phoneProducts.map((product) => [product.id, product]));
  const configuredHero = showcase.hero_product_id ? phoneMap.get(showcase.hero_product_id) : undefined;
  const configuredFeatured = (showcase.featured_product_ids ?? []).map((id) => phoneMap.get(id)).filter((product): product is Product => Boolean(product));
  const prioritized = configuredFeatured.length ? configuredFeatured : phoneProducts.filter((p) => p.is_featured && primaryImage(p)).sort((a, b) => rankProduct(b) - rankProduct(a));
  const fallbackPool = phoneProducts.filter((p) => primaryImage(p)).sort((a, b) => rankProduct(b) - rankProduct(a));
  const hero = configuredHero && primaryImage(configuredHero) ? configuredHero : (prioritized.find((p) => primaryImage(p)) ?? fallbackPool[0] ?? phoneProducts[0]);

  if (!hero) return <main className="final-cta"><div className="container"><div className="eyebrow">LOUAY PHONE</div><h1>المتجر قيد التجهيز.</h1><p>سيظهر محتوى الصفحة الرئيسية تلقائيًا عند توفر المنتجات في قاعدة البيانات.</p></div></main>;

  const lineupPool = [...prioritized.filter((p) => p.id !== hero.id), ...fallbackPool.filter((p) => p.id !== hero.id && !prioritized.some((x) => x.id === p.id))];
  const lineup = lineupPool.slice(0, 3);
  const featurePool = [...lineup, ...fallbackPool.filter((p) => !lineup.some((x) => x.id === p.id) && p.id !== hero.id)];
  const featureA = featurePool[0] ?? hero;
  const featureB = featurePool.find((p) => p.id !== featureA.id) ?? hero;
  const seenBrands = new Set<string>();
  const uniqueBrands = phoneProducts.filter((p) => p.brand && !seenBrands.has(p.brand) && seenBrands.add(p.brand)).slice(0, 6);
  const assetsByKey = assetMap(assets);
  const heroAsset = assetsByKey.get('hero2') ?? assetsByKey.get('hero');
  const logoAsset = assetsByKey.get('logo');

  return <main>
    <div className="announcement">تجربة جديدة لـ Louay Phone — <Link href="#lineup">اكتشف المختارات</Link></div>
    <header className="site-nav"><div className="container site-nav__row"><Link href="/" className="brand">{logoAsset ? <img src={logoAsset} alt="Louay Phone" style={{ height: 28, width: 'auto', objectFit: 'contain' }} /> : <>Louay <span>Phone</span></>}</Link><nav className="nav-links" aria-label="التنقل الرئيسي"><Link href="#lineup">الهواتف</Link><Link href="#experience">التجربة</Link><Link href="#brands">الماركات</Link><Link href="#about">Louay Phone</Link></nav><Link href="#lineup" className="nav-cta">تسوّق الآن</Link><MobileHomeMenu /></div></header>

    <section className="hero"><div className="container hero__inner reveal"><div className="eyebrow" style={{ color: '#a1a1a6' }}>{hero.brand ?? 'LOUAY PHONE'}</div><h1 className="hero__title">{hero.name}</h1><p className="hero__subtitle">منتجات حقيقية. تفاصيل واضحة. تجربة شراء هادئة.</p><div className="actions"><Link href={`/product/${hero.slug}`} className="btn btn--primary">معرفة المزيد</Link><Link href="#lineup" className="btn btn--link" style={{ color: '#2997ff' }}>تسوّق الآن</Link></div><div className="hero__image-wrap">{heroAsset ? <img className="hero__image" src={heroAsset} alt="" aria-hidden="true" loading="eager" /> : null}<div className="hero__glow" aria-hidden />{primaryImage(hero) ? <img className="hero__image" src={primaryImage(hero)!} alt={hero.images[0]?.alt_text ?? hero.name} fetchPriority="high" /> : <div className="hero__placeholder">الصورة قيد الإضافة</div>}</div></div></section>

    <section id="lineup" className="section section--gray"><div className="container"><header className="section__head"><div className="eyebrow">THE LINEUP</div><h2 className="section__title">اختَر هاتفك.</h2><p className="section__lead">المحتوى مضبوط من إعدادات المتجر، مع fallback آمن إذا كان المنتج أو الصورة غير صالحين.</p></header><div className="lineup">{lineup.length ? lineup.map((p) => <ProductCard key={p.id} product={p} />) : <ProductCard product={hero} />}</div></div></section>

    <div id="experience">{featureA && <FeatureBand product={featureA} title="صمّم يومك حول الهاتف، مو العكس." text="نضع المنتج في مساحة واسعة، ونترك التفاصيل الأساسية تتكلم بدل ازدحام البطاقات والشارات." />}{featureB && <FeatureBand product={featureB} title="كل شيء مهم، بمكانه الصحيح." text="السعر، التوفر، الصورة، والمعلومات التي تحتاجها لاتخاذ القرار تظهر بنفس التسلسل في كل تجربة." light />}</div>

    <section id="brands" className="section section--gray"><div className="container"><header className="section__head"><div className="eyebrow">BRANDS</div><h2 className="section__title">أفضل الأسماء.</h2><p className="section__lead">العلامات التجارية مأخوذة مباشرة من قاعدة البيانات، وعند توفر شعار محفوظ يظهر بصريًا بدل النص فقط.</p></header><div className="brand-strip">{uniqueBrands.map((p) => <Link key={p.brand} href={`/products?brand=${encodeURIComponent(p.brand ?? '')}`} className="brand-tile">{assetsByKey.get(`brand:${p.brand_id}`) ? <img src={assetsByKey.get(`brand:${p.brand_id}`)!} alt={p.brand!} loading="lazy" /> : <span>{p.brand}</span>}<small>استكشف</small></Link>)}</div></div></section>

    <section id="about" className="final-cta"><div className="container"><div className="eyebrow">LOUAY PHONE</div><h2>اختيار أبسط.<br />قرار أفضل.</h2><p>المنتجات والمحتوى الظاهر في الرئيسية مرتبطان بإعدادات المتجر وقاعدة بياناته.</p><div className="actions"><Link href="#lineup" className="btn btn--dark">شاهد الهواتف</Link><Link href="/products" className="btn btn--link">كل المنتجات</Link></div></div></section>
    <footer className="footer-lite"><div className="container footer-lite__row"><span>© {new Date().getFullYear()} Louay Phone</span><span>متجر الهواتف الذكية</span></div></footer>
  </main>;
}

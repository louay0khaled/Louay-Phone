import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

type ImageRow = { id?: string; url: string; alt_text?: string | null; is_primary?: boolean | null; position?: number | null };
type Product = {
  id: string;
  name: string;
  slug: string;
  model?: string | null;
  price_usd?: number | null;
  price_syp?: number | null;
  stock_status?: string | null;
  installment_enabled?: boolean | null;
  brand_id?: string | null;
  brand?: string | null;
  is_featured?: boolean | null;
  images: ImageRow[];
};

const blockedTerms = ['pad', 'tab', 'tablet', 'cover', 'case', 'charger', 'watch', 'band', 'earbuds', 'buds'];

function isPhoneProduct(product: Product) {
  const text = `${product.name} ${product.model ?? ''} ${product.brand ?? ''}`.toLowerCase();
  return !blockedTerms.some((term) => text.includes(term));
}

function primaryImage(product: Product) {
  return [...product.images]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.position ?? 0) - Number(b.position ?? 0))[0]?.url ?? null;
}

function rankProduct(product: Product) {
  let score = 0;
  if (product.is_featured) score += 1000;
  if (primaryImage(product)) score += 400;
  if (product.stock_status === 'in_stock') score += 100;
  if (product.price_usd != null) score += 50;
  return score;
}

async function getProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const fields = 'id,name,slug,model,price_usd,price_syp,stock_status,installment_enabled,brand_id,is_featured,created_at';
  const result = await supabase
    .from('products')
    .select(fields)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(48);

  if (result.error || !result.data?.length) return [];

  const products = result.data as Omit<Product, 'brand' | 'images'>[];
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))] as string[];
  const productIds = products.map((p) => p.id);

  const [brandResult, imageResult] = await Promise.all([
    brandIds.length ? supabase.from('brands').select('id,name').in('id', brandIds) : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? supabase.from('product_images').select('id,product_id,url,alt_text,is_primary,position').in('product_id', productIds).order('position', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const brandMap = new Map((brandResult.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
  const imageMap = new Map<string, ImageRow[]>();
  for (const row of imageResult.data ?? []) {
    const productId = (row as { product_id: string }).product_id;
    const images = imageMap.get(productId) ?? [];
    images.push(row as ImageRow);
    imageMap.set(productId, images);
  }

  return products.map((p) => ({
    ...p,
    brand: brandMap.get(p.brand_id ?? '') ?? 'Louay Phone',
    images: imageMap.get(p.id) ?? [],
  }));
}

function money(product: Product) {
  if (product.price_usd == null) return 'السعر عند الطلب';
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(product.price_usd))}`;
}

function ProductCard({ product }: { product: Product }) {
  const src = primaryImage(product);
  return (
    <article className="product-card">
      <div>
        <div className="product-card__top">
          <span className="product-card__brand">{product.brand}</span>
          <span className="product-card__badge">{product.stock_status === 'out_of_stock' ? 'غير متوفر' : 'متوفر'}</span>
        </div>
        <div className="product-card__image">
          {src ? <img src={src} alt={product.images[0]?.alt_text ?? product.name} loading="lazy" /> : <div className="product-card__placeholder">الصورة قيد الإضافة</div>}
        </div>
      </div>
      <div className="product-card__copy">
        <h3>{product.name}</h3>
        <p>{product.model ?? 'اختيار مميز من Louay Phone.'}</p>
        <div className="price">{money(product)}{product.installment_enabled ? <small>يتوفر خيار التقسيط</small> : null}</div>
        <div className="product-card__actions">
          <Link href={`/product/${product.slug}`} className="btn btn--dark">معرفة المزيد</Link>
          <Link href={`/product/${product.slug}`} className="btn btn--link">اطلب الآن</Link>
        </div>
      </div>
    </article>
  );
}

function FeatureBand({ product, title, text, light = false }: { product: Product; title: string; text: string; light?: boolean }) {
  const src = primaryImage(product);
  return (
    <section className={`feature-band${light ? ' feature-band--light' : ''}`}>
      <div className="feature-band__copy">
        <div className="eyebrow">{product.brand}</div>
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <Link href={`/product/${product.slug}`} className={light ? 'btn btn--dark' : 'btn btn--primary'}>اكتشف الهاتف</Link>
        </div>
      </div>
      <div className="feature-band__media">
        {src ? <img src={src} alt={product.name} loading="lazy" /> : <span className="feature-band__placeholder">الصورة قيد الإضافة</span>}
      </div>
    </section>
  );
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await getProducts();
  const phoneProducts = products.filter(isPhoneProduct).sort((a, b) => rankProduct(b) - rankProduct(a));
  const visibleProducts = phoneProducts.length ? phoneProducts : products;
  const hero = visibleProducts.find((p) => primaryImage(p)) ?? visibleProducts[0];
  const lineup = visibleProducts.filter((p) => p.id !== hero?.id).slice(0, 3);
  const featureA = visibleProducts.find((p) => p.id !== hero?.id && primaryImage(p)) ?? visibleProducts[1] ?? hero;
  const featureB = visibleProducts.find((p) => p.id !== hero?.id && p.id !== featureA?.id && primaryImage(p)) ?? visibleProducts[2] ?? hero;
  const uniqueBrands = Array.from(new Map(visibleProducts.filter((p) => p.brand).map((p) => [p.brand, p])).values()).slice(0, 3);

  if (!hero) {
    return (
      <main className="final-cta">
        <div className="container">
          <div className="eyebrow">LOUAY PHONE</div>
          <h1>المتجر قيد التجهيز.</h1>
          <p>سيظهر محتوى الصفحة الرئيسية تلقائيًا عند توفر المنتجات في قاعدة البيانات.</p>
        </div>
      </main>
    );
  }

  const heroSrc = primaryImage(hero);

  return (
    <main>
      <div className="announcement">تجربة جديدة لـ Louay Phone — <Link href="#lineup">اكتشف المختارات</Link></div>
      <header className="site-nav">
        <div className="container site-nav__row">
          <Link href="/" className="brand">Louay <span>Phone</span></Link>
          <nav className="nav-links" aria-label="التنقل الرئيسي">
            <Link href="#lineup">الهواتف</Link>
            <Link href="#experience">التجربة</Link>
            <Link href="#brands">الماركات</Link>
            <Link href="#about">Louay Phone</Link>
          </nav>
          <Link href="#lineup" className="nav-cta">تسوّق الآن</Link>
          <button className="nav-menu" aria-label="فتح القائمة">القائمة</button>
        </div>
      </header>

      <section className="hero">
        <div className="container hero__inner reveal">
          <div className="eyebrow" style={{ color: '#a1a1a6' }}>{hero.brand ?? 'LOUAY PHONE'}</div>
          <h1 className="hero__title">{hero.name}</h1>
          <p className="hero__subtitle">منتجات حقيقية. تفاصيل واضحة. تجربة شراء هادئة.</p>
          <div className="actions">
            <Link href={`/product/${hero.slug}`} className="btn btn--primary">معرفة المزيد</Link>
            <Link href="#lineup" className="btn btn--link" style={{ color: '#2997ff' }}>تسوّق الآن</Link>
          </div>
          <div className="hero__image-wrap">
            <div className="hero__glow" aria-hidden />
            {heroSrc ? <img className="hero__image" src={heroSrc} alt={hero.images[0]?.alt_text ?? hero.name} fetchPriority="high" /> : <div className="hero__placeholder">الصورة قيد الإضافة</div>}
          </div>
        </div>
      </section>

      <section id="lineup" className="section section--gray">
        <div className="container">
          <header className="section__head">
            <div className="eyebrow">THE LINEUP</div>
            <h2 className="section__title">اختَر هاتفك.</h2>
            <p className="section__lead">مختارات حقيقية من متجرك، مرتبة أولًا حسب الصور والترويج والتوفر.</p>
          </header>
          <div className="lineup">{lineup.length ? lineup.map((p) => <ProductCard key={p.id} product={p} />) : <ProductCard product={hero} />}</div>
        </div>
      </section>

      <div id="experience">
        {featureA && <FeatureBand product={featureA} title="صمّم يومك حول الهاتف، مو العكس." text="نضع المنتج في مساحة واسعة، ونترك التفاصيل الأساسية تتكلم بدل ازدحام البطاقات والشارات." />}
        {featureB && <FeatureBand product={featureB} title="كل شيء مهم، بمكانه الصحيح." text="السعر، التوفر، الصورة، والمعلومات التي تحتاجها لاتخاذ القرار تظهر بنفس التسلسل في كل تجربة." light />}
      </div>

      <section id="brands" className="section section--gray">
        <div className="container">
          <header className="section__head">
            <div className="eyebrow">BRANDS</div>
            <h2 className="section__title">أفضل الأسماء.</h2>
            <p className="section__lead">الماركات الظاهرة هنا مأخوذة مباشرة من المنتجات الحقيقية في قاعدة البيانات.</p>
          </header>
          <div className="lineup">{uniqueBrands.map((p) => <ProductCard key={`brand-${p.brand}`} product={p} />)}</div>
        </div>
      </section>

      <section id="about" className="final-cta">
        <div className="container">
          <div className="eyebrow">LOUAY PHONE</div>
          <h2>اختيار أبسط.<br />قرار أفضل.</h2>
          <p>المحتوى الظاهر في الرئيسية مرتبط مباشرة ببيانات المتجر، بينما تظل الصور والمحتوى تحت تحكم الإدارة.</p>
          <div className="actions">
            <Link href="#lineup" className="btn btn--dark">شاهد الهواتف</Link>
            <Link href="#" className="btn btn--link">تواصل معنا</Link>
          </div>
        </div>
      </section>

      <footer className="footer-lite">
        <div className="container footer-lite__row">
          <span>© {new Date().getFullYear()} Louay Phone</span>
          <span>Homepage · Live Supabase data</span>
        </div>
      </footer>
    </main>
  );
}

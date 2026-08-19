import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

type ImageRow = { id?: string; url: string; alt_text?: string | null; is_primary?: boolean | null; position?: number | null };
type Product = { id: string; name: string; slug: string; model?: string | null; price_usd?: number | null; price_syp?: number | null; stock_status?: string | null; installment_enabled?: boolean | null; brand_id?: string | null; brand?: string | null; images: ImageRow[] };

const fallback: Product[] = [
  { id: 'demo-1', name: 'Xiaomi 15 Ultra', slug: '#', model: 'الهاتف الرائد', price_usd: 1150, brand: 'Xiaomi', images: [] },
  { id: 'demo-2', name: 'Poco X7 Pro', slug: '#', model: 'أداء قوي للألعاب', price_usd: 320, brand: 'POCO', images: [] },
  { id: 'demo-3', name: 'Samsung Galaxy A56', slug: '#', model: 'توازن يومي ممتاز', price_usd: 260, brand: 'Samsung', images: [] },
];

async function getProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  if (!supabase) return fallback;

  const activeAttempts = [
    supabase.from('products').select('id,name,slug,model,price_usd,price_syp,stock_status,installment_enabled,brand_id').eq('is_active', true).order('created_at', { ascending: false }).limit(12),
    supabase.from('products').select('id,name,slug,model,price_usd,price_syp,stock_status,installment_enabled,brand_id').eq('active', true).order('created_at', { ascending: false }).limit(12),
  ];

  let productResult = await activeAttempts[0];
  if (productResult.error) productResult = await activeAttempts[1];
  if (productResult.error || !productResult.data?.length) return fallback;

  const products = productResult.data as Omit<Product, 'brand' | 'images'>[];
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))] as string[];
  const productIds = products.map((p) => p.id);

  const [brandResult, imageResult] = await Promise.all([
    brandIds.length ? supabase.from('brands').select('id,name').in('id', brandIds) : Promise.resolve({ data: [], error: null }),
    productIds.length ? supabase.from('product_images').select('id,product_id,url,alt_text,is_primary,position').in('product_id', productIds).order('position', { ascending: true }) : Promise.resolve({ data: [], error: null }),
  ]);

  const brandMap = new Map((brandResult.data ?? []).map((b: any) => [b.id, b.name]));
  const imageMap = new Map<string, ImageRow[]>();
  for (const row of imageResult.data ?? []) {
    const images = imageMap.get((row as any).product_id) ?? [];
    images.push(row as ImageRow);
    imageMap.set((row as any).product_id, images);
  }

  return products.map((p) => ({ ...p, brand: brandMap.get(p.brand_id ?? '') ?? 'Louay Phone', images: imageMap.get(p.id) ?? [] }));
}

function money(product: Product) {
  if (product.price_usd == null) return 'السعر عند الطلب';
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(product.price_usd)}`;
}

function image(product: Product) {
  return [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.position ?? 0) - Number(b.position ?? 0))[0]?.url ?? null;
}

function ProductCard({ product }: { product: Product }) {
  const src = image(product);
  const isDemo = product.slug === '#';
  return (
    <article className="product-card">
      <div>
        <div className="product-card__top"><span className="product-card__brand">{product.brand}</span><span className="product-card__badge">{product.stock_status === 'out_of_stock' ? 'غير متوفر' : 'متوفر'}</span></div>
        <div className="product-card__image">
          {src ? <img src={src} alt={product.images[0]?.alt_text ?? product.name} /> : <div className="product-card__placeholder">صورة الهاتف</div>}
        </div>
      </div>
      <div className="product-card__copy">
        <h3>{product.name}</h3>
        <p>{product.model ?? 'اختيار مميز من Louay Phone.'}</p>
        <div className="price">{money(product)}{product.installment_enabled ? <small>يتوفر خيار التقسيط</small> : null}</div>
        <div className="product-card__actions">
          {isDemo ? <span className="btn btn--dark">قريبًا</span> : <Link href={`/product/${product.slug}`} className="btn btn--dark">معرفة المزيد</Link>}
          {!isDemo && <Link href={`/product/${product.slug}`} className="btn btn--link">اطلب الآن</Link>}
        </div>
      </div>
    </article>
  );
}

function FeatureBand({ product, title, text, light = false }: { product: Product; title: string; text: string; light?: boolean }) {
  const src = image(product);
  return (
    <section className={`feature-band${light ? ' feature-band--light' : ''}`}>
      <div className="feature-band__copy">
        <div className="eyebrow">{product.brand}</div>
        <h2>{title}</h2>
        <p>{text}</p>
        {product.slug !== '#' && <div className="actions" style={{ justifyContent: 'flex-start' }}><Link href={`/product/${product.slug}`} className={light ? 'btn btn--dark' : 'btn btn--primary'}>اكتشف الهاتف</Link></div>}
      </div>
      <div className="feature-band__media">{src ? <img src={src} alt={product.name} /> : <span className="feature-band__placeholder">أضف صورة المنتج من الإدارة</span>}</div>
    </section>
  );
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await getProducts();
  const hero = products.find((p) => image(p)) ?? products[0];
  const lineup = products.filter((p) => p.id !== hero.id).slice(0, 3);
  const featureA = products.find((p) => p.id !== hero.id) ?? hero;
  const featureB = products.find((p) => p.id !== hero.id && p.id !== featureA.id) ?? hero;
  const heroSrc = image(hero);

  return (
    <main>
      <div className="announcement">تجربة جديدة لـ Louay Phone — <Link href="#lineup">اكتشف المختارات</Link></div>
      <header className="site-nav">
        <div className="container site-nav__row">
          <Link href="/" className="brand">Louay <span>Phone</span></Link>
          <nav className="nav-links" aria-label="التنقل الرئيسي">
            <Link href="#lineup">الهواتف</Link><Link href="#experience">التجربة</Link><Link href="#brands">الماركات</Link><Link href="#about">Louay Phone</Link>
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
          <div className="actions"><Link href={hero.slug === '#' ? '#lineup' : `/product/${hero.slug}`} className="btn btn--primary">معرفة المزيد</Link><Link href="#lineup" className="btn btn--link" style={{ color: '#2997ff' }}>تسوّق الآن</Link></div>
          <div className="hero__image-wrap">
            <div className="hero__glow" aria-hidden />
            {heroSrc ? <img className="hero__image" src={heroSrc} alt={hero.images[0]?.alt_text ?? hero.name} /> : <div className="hero__placeholder">أضف صورة الـHero من لوحة الإدارة</div>}
          </div>
        </div>
      </section>

      <section id="lineup" className="section section--gray">
        <div className="container">
          <header className="section__head"><div className="eyebrow">THE LINEUP</div><h2 className="section__title">اختَر هاتفك.</h2><p className="section__lead">ثلاثة أبواب مختلفة لنفس الفكرة: هاتف واضح، سعر واضح، وخطوة شراء بسيطة.</p></header>
          <div className="lineup">{lineup.length ? lineup.map((p) => <ProductCard key={p.id} product={p} />) : <ProductCard product={hero} />}</div>
        </div>
      </section>

      <div id="experience">
        <FeatureBand product={featureA} title="صمّم يومك حول الهاتف، مو العكس." text="نضع المنتج في مساحة واسعة، ونترك التفاصيل الأساسية تتكلم بدل ازدحام البطاقات والشارات." />
        <FeatureBand product={featureB} title="كل شيء مهم، بمكانه الصحيح." text="السعر، التوفر، الصورة، والمعلومات التي تحتاجها لاتخاذ القرار تظهر بنفس التسلسل في كل تجربة." light />
      </div>

      <section id="brands" className="section section--gray">
        <div className="container">
          <header className="section__head"><div className="eyebrow">BRANDS</div><h2 className="section__title">أفضل الأسماء.</h2><p className="section__lead">Samsung، Xiaomi، Honor، POCO وغيرها — نقدمها ضمن تجربة واحدة بدل صفحات متفرقة.</p></header>
          <div className="lineup">{products.slice(0, 3).map((p) => <ProductCard key={`brand-${p.id}`} product={p} />)}</div>
        </div>
      </section>

      <section id="about" className="final-cta"><div className="container"><div className="eyebrow">LOUAY PHONE</div><h2>اختيار أبسط.<br/>قرار أفضل.</h2><p>هذه الصفحة هي البداية. كل قسم لاحق من المتجر سيُبنى على نفس اللغة البصرية عندما ننتهي من الرئيسية.</p><div className="actions"><Link href="#lineup" className="btn btn--dark">شاهد الهواتف</Link><Link href="#" className="btn btn--link">تواصل معنا</Link></div></div></section>

      <footer className="footer-lite"><div className="container footer-lite__row"><span>© {new Date().getFullYear()} Louay Phone</span><span>Homepage rebuild · Apple-inspired interaction system</span></div></footer>
    </main>
  );
}

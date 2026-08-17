'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Truck,
  X,
  Zap,
} from 'lucide-react';

type Asset = { url: string; version?: number } | undefined;
type Product = {
  id: string;
  name: string;
  slug: string;
  price_usd: number | null;
  price_syp: number | null;
  installment_enabled: boolean;
  is_featured?: boolean;
  brands?: { name?: string } | null;
  product_images?: Array<{
    id: string;
    url: string;
    alt_text?: string | null;
    is_primary?: boolean;
    position?: number | null;
  }>;
};
type Brand = { id: string; name: string; slug: string; imageUrl?: string };
type Slide = { url?: string; title: string; tag: string; description: string };

const fallbackSlides: Slide[] = [
  { title: 'أناقة تسبق المستقبل', tag: 'تكنولوجيا بلا حدود', description: 'اكتشف مجموعة مختارة من أقوى الهواتف العالمية.' },
  { title: 'قوة في كل تفصيل', tag: 'أحدث الإصدارات', description: 'أداء احترافي وتجربة استخدام فائقة السرعة.' },
  { title: 'تميز لا يشبه الآخرين', tag: 'اختيار Louay Phone', description: 'هواتف أصلية بعناية تناسب أسلوب حياتك.' },
];

function parseRate(rateValue: unknown) {
  if (typeof rateValue === 'number') return Number.isFinite(rateValue) ? rateValue : 0;
  if (typeof rateValue === 'string') return Number(rateValue) || 0;
  if (rateValue && typeof rateValue === 'object') {
    const value = rateValue as Record<string, unknown>;
    return Number(value.usd_to_syp ?? value.rate ?? 0) || 0;
  }
  return 0;
}

function currentSyp(priceUsd: unknown, storedSyp: unknown, rateValue: unknown) {
  const usd = Number(priceUsd || 0);
  const stored = Number(storedSyp || 0);
  const rate = parseRate(rateValue);
  if (usd > 0 && rate >= 1000) return Math.round(usd * rate);
  if (stored > 0) return Math.round(stored);
  return usd > 0 && rate > 0 ? Math.round(usd * rate) : 0;
}

function moneyUsd(value: number | null) {
  return value ? `$${Number(value).toLocaleString('en-US')}` : 'السعر عند الطلب';
}

function openChat() {
  window.dispatchEvent(new Event('louay:open-chat'));
}

function ProductCard({ product, exchangeRate, index }: { product: Product; exchangeRate: unknown; index: number }) {
  const images = [...(product.product_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const image = images.find((item) => item.is_primary) ?? images[0];
  const priceSyp = currentSyp(product.price_usd, product.price_syp, exchangeRate);

  return (
    <Link href={`/product/${product.slug}`} className="lp-home-product-card group" prefetch={index < 2} aria-label={`عرض ${product.name}`}>
      <div className="lp-home-product-media">
        {image?.url ? (
          <img src={image.url} alt={image.alt_text || product.name} className="lp-home-product-image" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <div className="lp-home-no-image" aria-hidden="true"><Sparkles size={24} /><span>الصورة ستُضاف لاحقًا</span></div>
        )}
        {product.installment_enabled && <span className="lp-home-product-badge">تقسيط</span>}
        <span className="lp-home-fav" aria-hidden="true"><Star size={17} /></span>
      </div>
      <div className="lp-home-product-info">
        <div className="lp-home-product-brand">{product.brands?.name ?? 'Louay Phone'}</div>
        <h3>{product.name}</h3>
        <div className="lp-home-spec-row"><span>جودة موثوقة</span>{product.installment_enabled ? <span>تقسيط</span> : <span>ضمان سنة</span>}</div>
        <div className="lp-home-product-bottom"><div><strong>{priceSyp ? `${priceSyp.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب'}</strong><small>{moneyUsd(product.price_usd)}</small></div><span className="lp-home-product-arrow"><ArrowLeft size={17} /></span></div>
      </div>
    </Link>
  );
}

export default function HomepageShowcase({ logo, slides, products, brands, exchangeRate, stats }: {
  logo: Asset;
  slides: Slide[];
  products: Product[];
  brands: Brand[];
  exchangeRate: unknown;
  stats: { productCount: number; brandCount: number; reviewCount: number; installmentCount: number };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const slideItems = useMemo(() => (slides.length ? slides : fallbackSlides), [slides]);

  useEffect(() => {
    if (currentSlide >= slideItems.length) setCurrentSlide(0);
  }, [currentSlide, slideItems.length]);

  const goTo = useCallback((index: number) => {
    setCurrentSlide((index + slideItems.length) % slideItems.length);
  }, [slideItems.length]);

  useEffect(() => {
    if (paused || slideItems.length < 2 || document.visibilityState !== 'visible') return;
    const timer = window.setInterval(() => setCurrentSlide((value) => (value + 1) % slideItems.length), 5600);
    return () => window.clearInterval(timer);
  }, [paused, slideItems.length]);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    const onVisibility = () => setPaused(document.hidden);
    window.addEventListener('louay:close-home-menu', closeMenu);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('louay:close-home-menu', closeMenu);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!sliderRef.current || !sliderRef.current.contains(document.activeElement)) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(currentSlide + 1); setPaused(true); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(currentSlide - 1); setPaused(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentSlide, goTo]);

  const pause = () => setPaused(true);
  const resume = () => { if (document.visibilityState === 'visible') setPaused(false); };

  return <main data-storefront="true" className="lp-home">
    <div className="lp-home-orb lp-home-orb-one" aria-hidden="true" />
    <div className="lp-home-orb lp-home-orb-two" aria-hidden="true" />
    <header className="lp-home-header" data-home-header>
      <div className="lp-home-container"><nav className="lp-home-nav lp-home-glass" aria-label="التنقل الرئيسي">
        <Link href="/" className="lp-home-logo" aria-label="Louay Phone - الرئيسية">
          {logo?.url ? <img src={logo.url} alt="Louay Phone" decoding="async" /> : <><span className="lp-home-logo-icon"><Smartphone size={22} /></span><span><strong>Louay Phone</strong><small>SMART TECHNOLOGY</small></span></>}
        </Link>
        <div className={`lp-home-links ${menuOpen ? 'open' : ''}`}>
          <Link href="/" onClick={() => setMenuOpen(false)}>الرئيسية</Link>
          <Link href="/products" onClick={() => setMenuOpen(false)}>الماركات</Link>
          <a href="#featured" onClick={() => setMenuOpen(false)}>أحدث الهواتف</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>من نحن</a>
          <button type="button" onClick={() => { setMenuOpen(false); openChat(); }}>تواصل معنا</button>
        </div>
        <div className="lp-home-actions">
          <Link href="/products" className="lp-home-icon-btn" aria-label="البحث عن هاتف"><Search size={19} /></Link>
          <button className="lp-home-icon-btn lp-home-menu-btn" aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          <Link href="/products" className="lp-home-primary-btn lp-home-nav-cta">تصفح الهواتف</Link>
        </div>
      </nav></div>
    </header>

    <section className="lp-home-hero" id="home">
      <div className="lp-home-wave" aria-hidden="true" />
      <div className="lp-home-container"><div className="lp-home-hero-grid">
        <div className="lp-home-hero-copy">
          <div className="lp-home-eyebrow"><span /> الوجهة الأولى لعالم الهواتف الذكية</div>
          <h1>مستقبل التقنية <span>بين يديك</span></h1>
          <p>في <strong>Louay Phone</strong> نمنحك تجربة استثنائية لاختيار أحدث الهواتف الذكية، بمعلومات واضحة، أسعار محدثة، وخدمة تليق بطموحاتك.</p>
          <div className="lp-home-hero-actions"><Link href="/products" className="lp-home-primary-btn">اكتشف الهواتف <ArrowLeft size={18} /></Link><button type="button" className="lp-home-secondary-btn" onClick={openChat}><MessageCircle size={18} /> تحدث مع مستشار</button></div>
          <div className="lp-home-mini-features"><span><ShieldCheck size={16} /> ضمان واضح</span><span><Truck size={16} /> متابعة سريعة</span><span><Headphones size={16} /> دعم مباشر</span></div>
        </div>

        <div ref={sliderRef} className="lp-home-slider-shell lp-home-glass" tabIndex={0} role="region" aria-roledescription="carousel" aria-label="العروض المميزة"
          onMouseEnter={pause} onMouseLeave={resume} onFocus={pause}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resume(); }}
          onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; pause(); }}
          onTouchEnd={(event) => {
            if (touchStart.current == null) { resume(); return; }
            const end = event.changedTouches[0]?.clientX ?? touchStart.current;
            const distance = end - touchStart.current;
            touchStart.current = null;
            if (Math.abs(distance) > 48) goTo(currentSlide + (distance < 0 ? 1 : -1));
            window.setTimeout(resume, 2500);
          }}>
          <div className="lp-home-slider">
            <div className="lp-home-slides" style={{ transform: `translate3d(-${currentSlide * 100}%,0,0)` }}>
              {slideItems.map((slide, index) => <article className={`lp-home-slide ${index === currentSlide ? 'active' : ''}`} key={`${slide.title}-${index}`} aria-hidden={index !== currentSlide} aria-roledescription="slide" aria-label={`${index + 1} من ${slideItems.length}`}>
                {slide.url ? <img src={slide.url} alt={slide.title} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={index === 0 ? 'high' : 'auto'} /> : <div className="lp-home-slide-placeholder" aria-hidden="true"><Sparkles size={46} /><span>أضف صورة العرض من لوحة الإدارة</span></div>}
                <div className="lp-home-slide-overlay" /><div className="lp-home-slide-content"><span>{slide.tag}</span><h2>{slide.title}</h2><p>{slide.description}</p></div>
              </article>)}
            </div>
            {slideItems.length > 1 && <><div className="lp-home-slider-controls"><button type="button" onClick={() => { goTo(currentSlide - 1); pause(); }} aria-label="العرض السابق"><ChevronRight size={19} /></button><button type="button" onClick={() => { goTo(currentSlide + 1); pause(); }} aria-label="العرض التالي"><ChevronLeft size={19} /></button></div><div className="lp-home-dots" aria-label="مؤشر العروض">{slideItems.map((_, index) => <button type="button" key={index} aria-label={`الانتقال إلى العرض ${index + 1}`} aria-current={index === currentSlide} className={index === currentSlide ? 'active' : ''} onClick={() => { goTo(index); pause(); }} />)}</div></>}
          </div>
        </div>
      </div></div>
    </section>

    <section className="lp-home-container lp-home-stats-section" aria-label="إحصائيات المتجر"><div className="lp-home-stats lp-home-glass">
      <div><span className="lp-home-stat-icon"><Smartphone size={20} /></span><strong>+{stats.productCount}</strong><small>هاتف منشور</small></div><div><span className="lp-home-stat-icon"><Award size={20} /></span><strong>+{stats.brandCount}</strong><small>علامة تجارية</small></div><div><span className="lp-home-stat-icon"><Star size={20} /></span><strong>{stats.reviewCount}</strong><small>تقييم عميل</small></div><div><span className="lp-home-stat-icon"><Zap size={20} /></span><strong>{stats.installmentCount}</strong><small>هاتف متاح للتقسيط</small></div>
    </div></section>

    <section className="lp-home-section" id="brands"><div className="lp-home-container"><div className="lp-home-heading"><span>تسوّق حسب الماركة</span><h2>اختر عالمك التقني</h2><p>تصفح الماركات المتوفرة، وانتقل إلى منتجات كل ماركة ضمن صفحة مستقلة وسلسة.</p></div><div className="lp-home-brand-grid">
      {brands.slice(0, 6).map((brand, index) => <Link href={`/products/brand/${brand.slug}`} prefetch={index < 2} key={brand.id} className="lp-home-brand-card group" aria-label={`ماركة ${brand.name}`}><div className="lp-home-brand-visual">{brand.imageUrl ? <img src={brand.imageUrl} alt={brand.name} loading="lazy" decoding="async" /> : <span>{brand.name}</span>}</div><div className="lp-home-brand-bottom"><strong>{brand.name}</strong><ArrowLeft size={17} /></div></Link>)}
    </div><div className="lp-home-center-cta"><Link href="/products" className="lp-home-secondary-btn">عرض جميع الماركات <ArrowLeft size={17} /></Link></div></div></section>

    <section className="lp-home-section lp-home-featured" id="featured"><div className="lp-home-container"><div className="lp-home-heading lp-home-heading-row"><div><span>مختاراتنا المميزة</span><h2>هواتف صنعت لتتفوّق</h2><p>أحدث الأجهزة المنشورة حاليًا، بأسعار محدثة وخيارات شراء واضحة.</p></div><Link href="/products" className="lp-home-text-link">عرض الكتالوج <ArrowLeft size={16} /></Link></div><div className="lp-home-products-grid">{products.slice(0, 6).map((product, index) => <ProductCard key={product.id} product={product} exchangeRate={exchangeRate} index={index} />)}</div>{!products.length && <div className="lp-home-empty">لا توجد هواتف منشورة حاليًا.</div>}</div></section>

    <section className="lp-home-section" id="about"><div className="lp-home-container"><div className="lp-home-about lp-home-glass"><div className="lp-home-about-visual"><div className="lp-home-about-orb" /><div className="lp-home-about-card"><Smartphone size={42} /><span>Louay Phone</span><small>تجربة تقنية استثنائية</small></div><div className="lp-home-chip lp-home-chip-one"><ShieldCheck size={17} /> جودة موثوقة</div><div className="lp-home-chip lp-home-chip-two"><Zap size={17} /> تقنية المستقبل</div></div><div className="lp-home-about-copy"><span className="lp-home-section-kicker">عن Louay Phone</span><h2>لأنك تستحق تجربة <em>استثنائية</em></h2><p>Louay Phone هو وجهتك لاختيار الهواتف الذكية ضمن تجربة واضحة وفاخرة؛ من استعراض الماركات والمواصفات إلى الطلب والتواصل المباشر.</p><div className="lp-home-about-list"><span><Check size={16} /> أجهزة وبيانات واضحة</span><span><Check size={16} /> أسعار محدثة</span><span><Check size={16} /> محادثة مباشرة</span><span><Check size={16} /> طلب شراء سهل</span></div></div></div></div></section>

    <section className="lp-home-container lp-home-cta-section"><div className="lp-home-cta lp-home-glass"><div><span>جاهز لاختيار هاتفك؟</span><h2>دعنا نساعدك تختار الأنسب.</h2><p>افتح المحادثة من داخل الموقع وسنتابع معك مباشرة.</p></div><div className="lp-home-cta-actions"><Link href="/products" className="lp-home-primary-btn">ابدأ التسوق <ArrowLeft size={18} /></Link><button type="button" className="lp-home-secondary-btn" onClick={openChat}><MessageCircle size={18} /> تحدث معنا</button></div></div></section>

    <footer className="lp-home-footer" id="contact"><div className="lp-home-container lp-home-footer-grid"><div><Link href="/" className="lp-home-logo">{logo?.url ? <img src={logo.url} alt="Louay Phone" loading="lazy" decoding="async" /> : <><span className="lp-home-logo-icon"><Smartphone size={22} /></span><span><strong>Louay Phone</strong><small>SMART TECHNOLOGY</small></span></>}</Link><p>وجهتك الموثوقة لاختيار أحدث الهواتف الذكية ضمن تجربة راقية وواضحة.</p></div><div><h3>روابط سريعة</h3><Link href="/products">الماركات والهواتف</Link><a href="#featured">الأحدث</a><a href="#about">من نحن</a><button type="button" onClick={openChat}>تواصل معنا</button></div><div><h3>خدمات</h3><span>تسعير محدث</span><span>تقسيط واضح</span><span>دعم مباشر</span></div></div><div className="lp-home-container lp-home-footer-bottom"><span>© {new Date().getFullYear()} Louay Phone</span><span>تجربة تقنية مصممة بعناية.</span></div></footer>
  </main>;
}

(() => {
  'use strict';

  const BOOT_KEY = 'data-louay-home-runtime';
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');

  if (document.body?.hasAttribute(BOOT_KEY)) return;
  document.body?.setAttribute(BOOT_KEY, 'true');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const formatSyp = (value) => safeNumber(value).toLocaleString('ar-SY');
  const formatUsd = (value) => value ? `$${safeNumber(value).toLocaleString('en-US')}` : 'السعر عند الطلب';

  function readRate(value) {
    if (typeof value === 'number') return safeNumber(value);
    if (typeof value === 'string') return safeNumber(value);
    if (value && typeof value === 'object') return safeNumber(value.usd_to_syp ?? value.rate);
    return 0;
  }

  function currentSyp(product, exchangeRate) {
    const usd = safeNumber(product?.price_usd);
    const stored = safeNumber(product?.price_syp);
    const rate = readRate(exchangeRate);

    // Store data uses full SYP amounts; the exchange-rate fallback is only used
    // when it is clearly configured as a real SYP/USD rate.
    if (stored > 0) return Math.round(stored);
    if (usd > 0 && rate >= 1000) return Math.round(usd * rate);
    return 0;
  }

  function showToast(message) {
    const toast = $('#toast');
    const toastText = $('#toastText');
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function openChat() {
    window.dispatchEvent(new Event('louay:open-chat'));
  }

  function setHeaderState() {
    const header = $('#header');
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 35);
  }

  function setupHeader() {
    const menuBtn = $('#menuBtn');
    const navLinks = $('#navLinks');
    if (menuBtn && navLinks && !menuBtn.dataset.bound) {
      menuBtn.dataset.bound = 'true';
      menuBtn.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', String(open));
        const icon = $('i', menuBtn);
        if (icon) {
          icon.classList.toggle('fa-bars', !open);
          icon.classList.toggle('fa-xmark', open);
        }
      });
    }

    $$('a[href^="#"]').forEach((link) => {
      if (link.dataset.bound || link.getAttribute('href') === '#') return;
      link.dataset.bound = 'true';
      link.addEventListener('click', (event) => {
        const id = link.getAttribute('href');
        const target = id ? document.querySelector(id) : null;
        if (!target) return;
        event.preventDefault();
        navLinks?.classList.remove('open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        const offset = (document.querySelector('#header')?.getBoundingClientRect().height ?? 0) + 14;
        window.scrollTo({ top: Math.max(0, target.offsetTop - offset), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
      });
    });

    $('.search-btn')?.addEventListener('click', () => { window.location.href = '/products'; });
    $('.bag-btn')?.addEventListener('click', () => { window.location.href = '/products'; });

    window.addEventListener('scroll', setHeaderState, { passive: true });
    setHeaderState();
  }

  function setupReveal() {
    const elements = $$('.reveal');
    if (!elements.length) return;
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    elements.forEach((element) => observer.observe(element));
  }

  function setupActiveNav() {
    const links = $$('#navLinks a');
    const sections = $$('main section[id]');
    if (!links.length || !sections.length || !('IntersectionObserver' in window)) return;
    const mapping = new Map();
    links.forEach((link) => mapping.set(link.getAttribute('href'), link));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.remove('active'));
        mapping.get(`#${entry.target.id}`)?.classList.add('active');
      });
    }, { rootMargin: '-25% 0px -55% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }

  function setupSlider() {
    const slider = $('#slider');
    const track = $('#slidesTrack');
    const dots = $('#sliderDots');
    const next = $('#nextSlide');
    const previous = $('#prevSlide');
    if (!slider || !track || !dots || !next || !previous || slider.dataset.bound) return;
    slider.dataset.bound = 'true';

    let current = 0;
    let timer = 0;
    let touchStart = null;
    let paused = false;

    const slides = () => $$('.slide', track);
    const stop = () => { if (timer) window.clearInterval(timer); timer = 0; };
    const start = () => {
      stop();
      if (paused || document.hidden || slides().length < 2) return;
      timer = window.setInterval(() => goTo(current + 1), 5600);
    };
    const renderDots = () => {
      const items = slides();
      dots.replaceChildren();
      items.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot';
        dot.setAttribute('aria-label', `الانتقال إلى العرض ${index + 1}`);
        dot.addEventListener('click', () => { goTo(index); paused = true; stop(); window.setTimeout(() => { paused = false; start(); }, 2500); });
        dots.appendChild(dot);
      });
    };
    const paint = () => {
      const items = slides();
      if (!items.length) return;
      current = (current + items.length) % items.length;
      track.style.transform = `translate3d(-${current * 100}%,0,0)`;
      items.forEach((slide, index) => {
        slide.classList.toggle('active', index === current);
        slide.setAttribute('aria-hidden', String(index !== current));
      });
      Array.from(dots.children).forEach((dot, index) => {
        dot.classList.toggle('active', index === current);
        dot.setAttribute('aria-current', index === current ? 'true' : 'false');
      });
    };
    function goTo(index) {
      const length = slides().length;
      if (!length) return;
      current = (index + length) % length;
      paint();
      start();
    }

    next.addEventListener('click', () => { paused = false; goTo(current + 1); });
    previous.addEventListener('click', () => { paused = false; goTo(current - 1); });
    slider.addEventListener('mouseenter', () => { paused = true; stop(); });
    slider.addEventListener('mouseleave', () => { paused = false; start(); });
    slider.addEventListener('focusin', () => { paused = true; stop(); });
    slider.addEventListener('focusout', (event) => { if (!slider.contains(event.relatedTarget)) { paused = false; start(); } });
    slider.addEventListener('touchstart', (event) => { touchStart = event.changedTouches[0]?.clientX ?? null; paused = true; stop(); }, { passive: true });
    slider.addEventListener('touchend', (event) => {
      if (touchStart == null) return;
      const distance = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
      touchStart = null;
      if (Math.abs(distance) > 48) goTo(current + (distance < 0 ? 1 : -1));
      paused = false;
      window.setTimeout(start, 1500);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    window.addEventListener('keydown', (event) => {
      if (!slider.contains(document.activeElement)) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current + 1); paused = true; stop(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current - 1); paused = true; stop(); }
    });

    renderDots();
    paint();
    start();
  }

  function renderAssets(data) {
    const logoUrl = data?.assets?.logo?.url;
    if (logoUrl) {
      $$('.logo').forEach((logo) => {
        if (logo.querySelector('.lp-admin-logo')) return;
        const image = document.createElement('img');
        image.className = 'lp-admin-logo';
        image.src = logoUrl;
        image.alt = 'Louay Phone';
        image.decoding = 'async';
        logo.replaceChildren(image);
      });
    }

    const hero = Array.isArray(data?.assets?.heroSlides) ? data.assets.heroSlides.filter((item) => item?.url) : [];
    const track = $('#slidesTrack');
    if (track && hero.length) {
      const copy = [
        ['تكنولوجيا بلا حدود', 'أناقة تسبق المستقبل', 'اكتشف مجموعة مختارة من أقوى الهواتف العالمية.'],
        ['أحدث الإصدارات', 'قوة في كل تفصيل', 'أداء احترافي وتجربة استخدام فائقة السرعة.'],
        ['اختيار Louay Phone', 'تميز لا يشبه الآخرين', 'هواتف أصلية بعناية تناسب أسلوب حياتك.'],
      ];
      track.innerHTML = hero.map((asset, index) => {
        const text = copy[index % copy.length];
        return `<article class="slide${index === 0 ? ' active' : ''}" aria-hidden="${index !== 0}" aria-roledescription="slide" aria-label="${index + 1} من ${hero.length}"><img src="${escapeHtml(asset.url)}" alt="${escapeHtml(text[1])}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async"><div class="slide-content"><span class="slide-tag">${escapeHtml(text[0])}</span><h3>${escapeHtml(text[1])}</h3><p>${escapeHtml(text[2])}</p></div></article>`;
      }).join('');
      setupSlider();
    }
  }

  function renderStats(stats) {
    const statValues = [
      [stats?.productCount, 'منتج متنوع'],
      [stats?.brandCount, 'علامة تجارية'],
      [stats?.reviewCount, 'تقييم عميل'],
      [stats?.installmentCount, 'هاتف متاح للتقسيط'],
    ];
    $$('.stats-wrap .stat').forEach((stat, index) => {
      const [value, label] = statValues[index] || [];
      const strong = $('strong', stat);
      const small = $('span', stat);
      if (Number.isFinite(Number(value)) && strong) strong.textContent = `+${Number(value).toLocaleString('en-US')}`;
      if (small && label) small.textContent = label;
    });
  }

  function productCard(product, index, exchangeRate) {
    const images = [...(product?.product_images ?? [])].sort((a, b) => safeNumber(a.position) - safeNumber(b.position));
    const image = images.find((item) => item.is_primary) ?? images[0];
    const priceSyp = currentSyp(product, exchangeRate);
    const brand = product?.brands?.name || 'Louay Phone';
    const badge = product?.installment_enabled ? 'تقسيط' : index === 0 ? 'وصل حديثًا' : index === 1 ? 'الأكثر طلبًا' : index === 2 ? 'عرض خاص' : 'اختيار مميز';
    const url = product?.slug ? `/product/${encodeURIComponent(product.slug)}` : '/products';
    return `<article class="product-card reveal visible" data-product-id="${escapeHtml(product.id)}" data-product-url="${escapeHtml(url)}"><div class="product-image">${image?.url ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt_text || product.name)}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async">` : `<div style="height:100%;display:grid;place-items:center;color:#6e8490;padding:30px;text-align:center;">الصورة ستُضاف لاحقًا</div>`}<span class="product-badge">${badge}</span><button type="button" class="favorite-btn" aria-label="إضافة ${escapeHtml(product.name)} للمفضلة"><i class="fa-regular fa-heart"></i></button></div><div class="product-info"><span class="product-brand">${escapeHtml(brand)}</span><h3>${escapeHtml(product.name || 'هاتف')}</h3><div class="product-specs"><span>جودة موثوقة</span>${product.installment_enabled ? '<span>تقسيط</span>' : '<span>ضمان سنة</span>'}</div><div class="product-bottom"><div class="price">${priceSyp ? `${formatSyp(priceSyp)} <small>ل.س</small>` : 'السعر عند الطلب'} <small>${formatUsd(product.price_usd)}</small></div><button type="button" class="add-btn" aria-label="فتح تفاصيل الهاتف"><i class="fa-solid fa-arrow-left"></i></button></div></div></article>`;
  }

  function renderProducts(products, exchangeRate) {
    const grid = $('.products-grid');
    if (!grid) return;
    if (!Array.isArray(products) || !products.length) {
      grid.innerHTML = '<div class="lp-home-empty">لا توجد هواتف منشورة حاليًا.</div>';
      return;
    }
    grid.innerHTML = products.slice(0, 6).map((product, index) => productCard(product, index, exchangeRate)).join('');
  }

  function patchStaticCopy() {
    const replacements = [
      ['أضف عنوان متجر Louay Phone هنا', 'التواصل عبر المحادثة المباشرة'],
      ['+000 000 000 000', 'المحادثة المباشرة'],
      ['contact@louayphone.com', 'تواصل معنا عبر الموقع'],
    ];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let text = node.nodeValue || '';
      replacements.forEach(([from, to]) => { if (text.includes(from)) text = text.replaceAll(from, to); });
      node.nodeValue = text;
    });

    $$('.category-card').forEach((card) => {
      if (card.getAttribute('href') === '#') card.setAttribute('href', '/products');
    });

    $$('.socials a[href="#"]').forEach((link) => {
      link.setAttribute('href', '/products');
      link.removeAttribute('aria-label');
    });
  }

  function setupProductDelegation() {
    const grid = $('.products-grid');
    if (!grid || grid.dataset.bound) return;
    grid.dataset.bound = 'true';

    let favorites = new Set();
    try {
      const stored = JSON.parse(localStorage.getItem('louay-phone-favorites') || '[]');
      favorites = new Set(Array.isArray(stored) ? stored.map(String) : []);
    } catch { favorites = new Set(); }

    const paintFavorites = () => $$('.favorite-btn', grid).forEach((button) => {
      const id = button.closest('.product-card')?.dataset.productId;
      if (!id) return;
      button.classList.toggle('active', favorites.has(String(id)));
      button.setAttribute('aria-pressed', String(favorites.has(String(id))));
    };

    grid.addEventListener('click', (event) => {
      const target = event.target;
      const favorite = target.closest('.favorite-btn');
      const add = target.closest('.add-btn');
      const card = target.closest('.product-card');
      if (!card) return;

      if (favorite) {
        event.preventDefault();
        event.stopPropagation();
        const id = String(card.dataset.productId || '');
        if (!id) return;
        if (favorites.has(id)) { favorites.delete(id); showToast('تمت الإزالة من المفضلة'); }
        else { favorites.add(id); showToast('تمت الإضافة إلى المفضلة'); }
        try { localStorage.setItem('louay-phone-favorites', JSON.stringify([...favorites])); } catch {}
        paintFavorites();
        return;
      }

      if (add) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = card.dataset.productUrl || '/products';
        return;
      }

      if (event.button !== undefined && event.button !== 0) return;
      window.location.href = card.dataset.productUrl || '/products';
    });

    paintFavorites();
  }

  function setupChatTriggers() {
    ['.btn-secondary[href="#about"]', '.contact-list', '.about-content a[href="#contact"]'].forEach(() => {});
    $$('a[href="#contact"], .socials a').forEach((link) => {
      if (link.dataset.chatBound) return;
      const text = link.textContent || '';
      if (!text.includes('تواصل') && !link.matches('.socials a')) return;
      link.dataset.chatBound = 'true';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openChat();
      });
    });
  }

  function addScrollMotion() {
    const rootHome = $('.hero');
    if (!rootHome || reducedMotion.matches || coarsePointer.matches) return;
    let frame = 0;
    let pointer = null;
    const home = document.body;
    const update = () => {
      frame = 0;
      if (!pointer) return;
      const x = (pointer.clientX / window.innerWidth - 0.5) * 2;
      const y = (pointer.clientY / window.innerHeight - 0.5) * 2;
      home.style.setProperty('--pointer-x', x.toFixed(2));
      home.style.setProperty('--pointer-y', y.toFixed(2));
      pointer = null;
    };
    const move = (event) => {
      pointer = event;
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('pointermove', move, { passive: true });
  }

  async function loadLiveData() {
    const response = await fetch('/api/home-data', { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`home-data ${response.status}`);
    return response.json();
  }

  async function boot() {
    setupHeader();
    setupReveal();
    setupActiveNav();
    patchStaticCopy();
    setupProductDelegation();
    setupChatTriggers();
    setupSlider();
    addScrollMotion();

    try {
      const data = await loadLiveData();
      renderAssets(data);
      renderStats(data?.stats);
      renderProducts(data?.products, data?.exchangeRate);
      setupProductDelegation();
      setupReveal();
      applyUploadedFonts(data);
      connectAdminUploadTrigger();
      setupChatTriggers();
      setupSlider();
    } catch (error) {
      console.warn('تعذر تحميل بيانات المتجر الديناميكية:', error);
      connectAdminUploadTrigger();
    }
  }

  function applyUploadedFonts(data) {
    const regular = data?.assets?.fontRegular;
    const bold = data?.assets?.fontBold;
    if (!regular?.version && !bold?.version) return;
    let style = $('#louay-admin-fonts');
    if (!style) {
      style = document.createElement('style');
      style.id = 'louay-admin-fonts';
      document.head.appendChild(style);
    }
    const src = (weight, version) => version ? `/api/site-font?weight=${weight}&v=${encodeURIComponent(version)}` : '';
    const regularSrc = src('regular', regular?.version);
    const boldSrc = src('bold', bold?.version);
    style.textContent = `${regularSrc ? `@font-face{font-family:'LouayAdmin';src:url('${regularSrc}') format('opentype');font-weight:400 600;font-style:normal;font-display:swap}` : ''}${boldSrc ? `@font-face{font-family:'LouayAdmin';src:url('${boldSrc}') format('opentype');font-weight:700 900;font-style:normal;font-display:swap}` : ''}body,body *{font-family:'LouayAdmin','Tajawal',sans-serif!important}.fa,.fas,.far,.fab,.fa-solid,.fa-regular{font-family:'Font Awesome 6 Free'!important}.fa-brands{font-family:'Font Awesome 6 Brands'!important}`;
  }

  function connectAdminUploadTrigger() {
    const upload = $('#openUpload');
    if (!upload || upload.dataset.bound) return;
    upload.dataset.bound = 'true';
    upload.addEventListener('click', (event) => { event.preventDefault(); window.location.href = '/admin/settings'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

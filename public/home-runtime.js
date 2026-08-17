(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const goTo = (url) => { window.location.href = url; };

  function showToast(message) {
    const toast = $("#toast"), toastText = $("#toastText");
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function currentSyp(priceUsd, storedSyp, exchangeRate) {
    const usd = Number(priceUsd || 0);
    const stored = Number(storedSyp || 0);
    const rate = Number(exchangeRate?.usd_to_syp ?? exchangeRate?.rate ?? exchangeRate ?? 0);
    if (usd > 0 && rate > 0) return Math.round(usd * rate);
    return stored > 0 ? stored : 0;
  }

  function formatSyp(value) { return Number(value || 0).toLocaleString("ar-SY"); }

  function bindNavigation() {
    const menuBtn = $("#menuBtn"), navLinks = $("#navLinks");
    if (menuBtn && navLinks) {
      menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("open");
        const icon = menuBtn.querySelector("i");
        if (icon) { icon.classList.toggle("fa-bars"); icon.classList.toggle("fa-xmark"); }
      });
      $$("a", navLinks).forEach((link) => link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        const icon = menuBtn.querySelector("i");
        if (icon) { icon.classList.add("fa-bars"); icon.classList.remove("fa-xmark"); }
      }));
    }

    $$('a[href^="#"]').forEach((link) => link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      if ((link.textContent || "").includes("تواصل معنا")) return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", id);
    }));

    const header = $("#header");
    const updateHeader = () => { if (header) header.classList.toggle("scrolled", window.scrollY > 35); };
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

    const searchBtn = $(".search-btn");
    if (searchBtn) searchBtn.addEventListener("click", () => goTo("/products"));
    const bagBtn = $(".bag-btn");
    if (bagBtn) bagBtn.addEventListener("click", () => goTo("/products"));
  }

  function setupReveal() {
    const revealElements = $$(".reveal");
    if (!("IntersectionObserver" in window)) { revealElements.forEach((el) => el.classList.add("visible")); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } });
    }, { threshold: 0.12 });
    revealElements.forEach((el) => observer.observe(el));
  }

  function setupActiveNav() {
    const sections = $$("section[id], footer[id]"), navigationLinks = $$(".nav-links a");
    const update = () => {
      let currentSection = "home";
      sections.forEach((section) => { if (window.scrollY >= section.offsetTop - 180) currentSection = section.id; });
      navigationLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${currentSection}`));
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function setupSlider() {
    const slider = $("#slider"), track = $("#slidesTrack"), dotsContainer = $("#sliderDots"), nextButton = $("#nextSlide"), previousButton = $("#prevSlide");
    if (!slider || !track || !dotsContainer || !nextButton || !previousButton) return;
    let currentSlide = 0, autoPlayTimer = null, touchStartX = 0, touchEndX = 0;
    const getSlides = () => [...track.querySelectorAll(".slide")];
    const createDots = () => {
      const slides = getSlides(); dotsContainer.innerHTML = "";
      slides.forEach((_, index) => {
        const dot = document.createElement("button"); dot.className = "dot"; dot.setAttribute("aria-label", `الانتقال إلى الصورة ${index + 1}`); if (index === currentSlide) dot.classList.add("active");
        dot.addEventListener("click", () => { currentSlide = index; updateSlider(); restartAutoPlay(); }); dotsContainer.appendChild(dot);
      });
    };
    const updateSlider = () => {
      const slides = getSlides(); if (!slides.length) return;
      if (currentSlide >= slides.length) currentSlide = 0; if (currentSlide < 0) currentSlide = slides.length - 1;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      slides.forEach((slide, index) => slide.classList.toggle("active", index === currentSlide));
      [...dotsContainer.children].forEach((dot, index) => dot.classList.toggle("active", index === currentSlide));
    };
    const startAutoPlay = () => { window.clearInterval(autoPlayTimer); autoPlayTimer = window.setInterval(() => { currentSlide++; updateSlider(); }, 5200); };
    const restartAutoPlay = () => startAutoPlay();
    nextButton.addEventListener("click", () => { currentSlide++; updateSlider(); restartAutoPlay(); });
    previousButton.addEventListener("click", () => { currentSlide--; updateSlider(); restartAutoPlay(); });
    slider.addEventListener("mouseenter", () => window.clearInterval(autoPlayTimer));
    slider.addEventListener("mouseleave", startAutoPlay);
    slider.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
    slider.addEventListener("touchend", (event) => { touchEndX = event.changedTouches[0].screenX; const distance = touchEndX - touchStartX; if (Math.abs(distance) > 50) { if (distance < 0) currentSlide++; else currentSlide--; updateSlider(); restartAutoPlay(); } }, { passive: true });
    createDots(); updateSlider(); startAutoPlay();
  }

  function setupFavoritesAndProducts() {
    const favorites = new Set(JSON.parse(localStorage.getItem("louay-phone-favorites") || "[]"));
    $$(".favorite-btn").forEach((button) => {
      const key = button.closest(".product-card")?.dataset.productId;
      if (key && favorites.has(key)) button.classList.add("active");
      button.addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation(); if (!key) return;
        if (favorites.has(key)) { favorites.delete(key); button.classList.remove("active"); showToast("تمت الإزالة من المفضلة"); }
        else { favorites.add(key); button.classList.add("active"); showToast("تمت الإضافة إلى المفضلة"); }
        localStorage.setItem("louay-phone-favorites", JSON.stringify([...favorites]));
      });
    });
    $$(".product-card").forEach((card) => {
      const url = card.dataset.productUrl; if (!url) return;
      card.addEventListener("click", (event) => { if (event.target.closest(".favorite-btn") || event.target.closest(".add-btn")) return; goTo(url); });
    });
    $$(".add-btn").forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault(); event.stopPropagation(); const productUrl = button.closest(".product-card")?.dataset.productUrl;
      if (productUrl) goTo(productUrl); else showToast("افتح تفاصيل الهاتف لإكمال الطلب.");
    }));
  }

  function renderProducts(products, exchangeRate) {
    const grid = $(".products-grid"); if (!grid || !Array.isArray(products) || !products.length) return;
    grid.innerHTML = products.slice(0, 6).map((product, index) => {
      const images = [...(product.product_images || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const image = images.find((item) => item.is_primary) || images[0];
      const priceSyp = currentSyp(product.price_usd, product.price_syp, exchangeRate);
      const brand = product.brands?.name || "Louay Phone";
      const badge = index === 0 ? "وصل حديثًا" : index === 1 ? "الأكثر طلبًا" : index === 2 ? "عرض خاص" : "اختيار مميز";
      return `<article class="product-card reveal visible" data-product-id="${escapeHtml(product.id)}" data-product-url="/product/${escapeHtml(product.slug)}"><div class="product-image">${image?.url ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt_text || product.name)}">` : `<div style="height:100%;display:grid;place-items:center;color:#6e8490;padding:30px;text-align:center;">الصورة ستُضاف لاحقًا</div>`}<span class="product-badge">${badge}</span><button class="favorite-btn" aria-label="إضافة للمفضلة"><i class="fa-regular fa-heart"></i></button></div><div class="product-info"><span class="product-brand">${escapeHtml(brand)}</span><h3>${escapeHtml(product.name)}</h3><div class="product-specs"><span>جودة موثوقة</span><span>ضمان سنة</span>${product.installment_enabled ? "<span>تقسيط</span>" : "<span>5G</span>"}</div><div class="product-bottom"><div class="price">${priceSyp ? formatSyp(priceSyp) : "السعر عند الطلب"} <small>${product.price_usd ? `$${Number(product.price_usd).toLocaleString("en-US")}` : ""}</small></div><button class="add-btn" aria-label="فتح تفاصيل الهاتف"><i class="fa-solid fa-bag-shopping"></i></button></div></div></article>`;
    }).join("");
    setupFavoritesAndProducts();
  }

  function renderAssets(data) {
    const logo = data?.assets?.logo;
    if (logo?.url) {
      $$(".logo").forEach((logoEl) => { logoEl.innerHTML = `<img src="${escapeHtml(logo.url)}" alt="Louay Phone" class="lp-admin-logo">`; });
    }
    const slides = Array.isArray(data?.assets?.heroSlides) ? data.assets.heroSlides : [];
    if (slides.length) {
      const slideEls = $$("#slidesTrack .slide");
      slides.slice(0, slideEls.length).forEach((asset, index) => { if (asset?.url && slideEls[index]) { const img = $("img", slideEls[index]); if (img) img.src = asset.url; } });
    }
  }

  function applyUploadedFonts(data) {
    const regular = data?.assets?.fontRegular, bold = data?.assets?.fontBold;
    if (!regular && !bold) return;
    const style = document.createElement("style"); style.id = "louay-admin-fonts";
    const parts = [];
    const format = (asset) => String(asset?.url || "").toLowerCase().split("?")[0].endsWith(".otf") ? "opentype" : "truetype";
    if (regular?.version) parts.push(`@font-face{font-family:'LouayAdmin';src:url('/api/site-font?weight=regular&v=${encodeURIComponent(regular.version)}') format('${format(regular)}');font-style:normal;font-weight:400 600;font-display:swap}`);
    if (bold?.version) parts.push(`@font-face{font-family:'LouayAdmin';src:url('/api/site-font?weight=bold&v=${encodeURIComponent(bold.version)}') format('${format(bold)}');font-style:normal;font-weight:700 900;font-display:swap}`);
    parts.push(`body,body *{font-family:'LouayAdmin','Tajawal',sans-serif!important}.fa,.fas,.far,.fab,.fa-solid,.fa-regular,.fa-brands{font-family:'Font Awesome 6 Free'!important}.fa-brands{font-family:'Font Awesome 6 Brands'!important}.lp-admin-logo{max-width:180px;max-height:52px;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 0 18px rgba(69,223,255,.18))}`);
    style.textContent = parts.join(""); document.head.appendChild(style);
  }

  function connectAdminUploadTrigger() {
    const upload = $("#openUpload"); if (!upload) return;
    upload.addEventListener("click", (event) => { event.preventDefault(); goTo("/admin/settings"); });
  }

  function setupChat() {
    if (document.querySelector(".lp-static-chat")) return;
    const style = document.createElement("style");
    style.textContent = `.lp-static-chat{position:fixed;right:18px;bottom:18px;z-index:5000;font-family:inherit}.lp-static-chat .lp-chat-fab{width:58px;height:58px;border:1px solid rgba(120,226,255,.35);border-radius:50%;background:rgba(2,12,18,.82);color:#a8f3ff;backdrop-filter:blur(16px);box-shadow:0 18px 45px rgba(0,0,0,.4),0 0 35px rgba(69,223,255,.13);display:grid;place-items:center;cursor:pointer;transition:.3s}.lp-static-chat .lp-chat-fab:hover{transform:translateY(-3px);border-color:#45dfff;color:#45dfff}.lp-static-chat .lp-chat-panel{display:none;position:absolute;right:0;bottom:72px;width:min(370px,calc(100vw - 30px));height:min(590px,calc(100dvh - 100px));overflow:hidden;border:1px solid rgba(120,226,255,.18);border-radius:24px;background:linear-gradient(145deg,rgba(8,19,28,.98),rgba(2,7,12,.98));box-shadow:0 30px 100px rgba(0,0,0,.55)}.lp-static-chat.open .lp-chat-panel{display:flex;flex-direction:column}.lp-static-chat .lp-chat-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(120,226,255,.12);background:linear-gradient(135deg,rgba(69,223,255,.16),rgba(0,0,0,.18))}.lp-static-chat .lp-chat-head strong{font-size:16px}.lp-static-chat .lp-chat-head small{display:block;margin-top:4px;color:#93aab6;font-size:10px}.lp-static-chat .lp-chat-close{background:none;border:0;color:#dffbff;font-size:24px;cursor:pointer}.lp-static-chat .lp-chat-body{flex:1;overflow:auto;padding:14px;background:radial-gradient(circle at 50% 0,rgba(69,223,255,.06),transparent 45%)}.lp-static-chat .lp-chat-start{display:grid;gap:10px;place-items:center;text-align:center;padding:28px 12px;color:#93aab6}.lp-static-chat .lp-chat-start input{width:100%;padding:12px 13px;border:1px solid rgba(120,226,255,.13);border-radius:12px;background:rgba(255,255,255,.04);color:#fff;outline:none}.lp-static-chat .lp-chat-start button,.lp-static-chat .lp-chat-send{border:0;border-radius:12px;background:linear-gradient(135deg,#a8f3ff,#45dfff,#31a8ff);color:#001218;font-weight:900;cursor:pointer}.lp-static-chat .lp-chat-start button{width:100%;padding:12px}.lp-static-chat .lp-chat-messages{display:grid;gap:9px}.lp-static-chat .lp-chat-msg{max-width:82%;padding:10px 12px;border-radius:15px;font-size:13px;line-height:1.65;white-space:pre-wrap}.lp-static-chat .lp-chat-msg.user{margin-right:auto;background:#45dfff;color:#001218;border-bottom-right-radius:5px}.lp-static-chat .lp-chat-msg.admin{margin-left:auto;background:#0f2432;color:#e8fbff;border:1px solid rgba(120,226,255,.12);border-bottom-left-radius:5px}.lp-static-chat .lp-chat-compose{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(120,226,255,.1);background:#03090e}.lp-static-chat .lp-chat-compose input{min-width:0;flex:1;padding:11px 12px;border:1px solid rgba(120,226,255,.13);border-radius:12px;background:rgba(255,255,255,.04);color:#fff;outline:none}.lp-static-chat .lp-chat-send{width:58px}`;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.className = "lp-static-chat";
    root.innerHTML = `<div class="lp-chat-panel" dir="rtl"><div class="lp-chat-head"><div><strong>تواصل معنا</strong><small>دعم مباشر من Louay Phone</small></div><button class="lp-chat-close" aria-label="إغلاق">×</button></div><div class="lp-chat-body"><div class="lp-chat-start"><div style="font-size:34px">💬</div><div>أرسل استفسارك وسنرد عليك مباشرة.</div><input class="lp-chat-name" placeholder="اسمك"><button class="lp-chat-start-btn">بدء المحادثة</button></div><div class="lp-chat-messages"></div></div><div class="lp-chat-compose"><input class="lp-chat-input" placeholder="اكتب رسالتك..."><button class="lp-chat-send">إرسال</button></div></div><button class="lp-chat-fab" aria-label="تواصل معنا"><i class="fa-solid fa-comment-dots"></i></button>`;
    document.body.appendChild(root);

    const tokenKey = "louay_phone_chat_token";
    let token = localStorage.getItem(tokenKey) || "";
    const panel = $(".lp-chat-panel", root), startBox = $(".lp-chat-start", root), messagesBox = $(".lp-chat-messages", root), nameInput = $(".lp-chat-name", root), startBtn = $(".lp-chat-start-btn", root), input = $(".lp-chat-input", root), fab = $(".lp-chat-fab", root);
    let poll = null;

    const renderMessages = (messages) => {
      messagesBox.innerHTML = (messages || []).map((message) => `<div class="lp-chat-msg ${message.senderType === "user" ? "user" : "admin"}">${escapeHtml(message.text || "")}</div>`).join("");
      const body = $(".lp-chat-body", root); body.scrollTop = body.scrollHeight;
    };
    const refresh = async () => {
      if (!token) return;
      const res = await fetch("/api/chat/messages/get", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({token}), cache:"no-store" });
      if (!res.ok) return;
      const data = await res.json(); startBox.style.display = "none"; messagesBox.style.display = "grid"; input.disabled = false; renderMessages(data.messages || []);
    };
    const ensureSession = async () => {
      if (token) return token;
      const res = await fetch("/api/chat/session", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:nameInput.value.trim() || undefined}) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "تعذر فتح المحادثة");
      token = data.token; localStorage.setItem(tokenKey, token); return token;
    };
    const send = async () => {
      const text = input.value.trim(); if (!text || !token) return;
      const res = await fetch("/api/chat/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({token,text,name:nameInput.value.trim() || undefined}) });
      const data = await res.json(); if (!res.ok) { showToast(data.error || "تعذر إرسال الرسالة"); return; }
      input.value = ""; await refresh();
    };
    const open = async () => {
      root.classList.add("open");
      if (!token) { startBox.style.display = "grid"; messagesBox.style.display = "none"; input.disabled = true; }
      else { startBox.style.display = "none"; messagesBox.style.display = "grid"; input.disabled = false; await refresh(); }
      if (!poll) poll = window.setInterval(() => refresh().catch(()=>{}), 2000);
    };

    fab.addEventListener("click", open);
    $(".lp-chat-close", root).addEventListener("click", () => root.classList.remove("open"));
    startBtn.addEventListener("click", async () => { try { await ensureSession(); await refresh(); } catch (error) { showToast(error.message || "تعذر فتح المحادثة"); } });
    $(".lp-chat-send", root).addEventListener("click", send);
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); send(); } });

    $$('a[href="#contact"]').forEach((link) => {
      if ((link.textContent || "").includes("تواصل معنا")) link.addEventListener("click", (event) => { event.preventDefault(); open(); });
    });
  }

  async function boot() {
    bindNavigation(); setupSlider(); setupReveal(); setupActiveNav(); setupFavoritesAndProducts(); connectAdminUploadTrigger(); setupChat();
    try {
      const response = await fetch("/api/home-data", { cache: "no-store", headers: { "cache-control": "no-cache" } });
      if (!response.ok) throw new Error(`home-data ${response.status}`);
      const data = await response.json(); renderAssets(data); applyUploadedFonts(data); renderProducts(data.products || [], data.exchangeRate);
      const count = data?.stats?.productCount; const firstStat = $(".stats-wrap .stat strong");
      if (firstStat && Number.isFinite(Number(count))) firstStat.textContent = `+${Number(count).toLocaleString("en-US")}`;
    } catch (error) { console.warn("تعذر تحميل بيانات المتجر الديناميكية:", error); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true }); else boot();
})();

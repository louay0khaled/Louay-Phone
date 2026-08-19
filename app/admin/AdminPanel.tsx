'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './AdminPanel.module.css';

type Tab = 'products' | 'orders' | 'installments' | 'customers' | 'conversations' | 'reviews' | 'homepage' | 'settings' | 'assets' | 'audit';

type Product = {
  id: string;
  name: string;
  model: string | null;
  price_usd: number | null;
  price_syp: number | null;
  stock_quantity: number;
  stock_status: string | null;
  is_active: boolean;
  is_featured: boolean;
  slug: string;
};

type Setting = { key: string; value: Record<string, any> };

const tabs: [Tab, string][] = [
  ['products', 'المنتجات'],
  ['orders', 'الطلبات'],
  ['installments', 'التقسيط'],
  ['customers', 'العملاء'],
  ['conversations', 'المحادثات'],
  ['reviews', 'التقييمات'],
  ['homepage', 'الرئيسية'],
  ['settings', 'الإعدادات'],
  ['assets', 'الأصول'],
  ['audit', 'السجل'],
];

export default function AdminPanel() {
  const [mode, setMode] = useState<'login' | 'dashboard'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('products');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const getSetting = (key: string) => settings.find((item) => item.key === key)?.value ?? {};
  const store = getSetting('store');
  const exchange = getSetting('exchange_rate');
  const showcase = getSetting('homepage_showcase');

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => `${product.name} ${product.model ?? ''}`.toLowerCase().includes(q));
  }, [products, query]);

  useEffect(() => {
    let active = true;
    supabaseBrowser.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: admin } = await supabaseBrowser.from('admins').select('id,is_active').eq('id', data.user.id).maybeSingle();
      if (admin?.is_active) {
        setMode('dashboard');
        await loadAll();
      }
    });
    return () => { active = false; };
  }, []);

  async function loadAll() {
    setError('');
    const [productsResult, ordersResult, plansResult, customersResult, conversationsResult, reviewsResult, settingsResult, assetsResult, auditResult] = await Promise.all([
      supabaseBrowser.from('products').select('id,name,model,price_usd,price_syp,stock_quantity,stock_status,is_active,is_featured,slug').order('updated_at', { ascending: false }).limit(300),
      supabaseBrowser.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseBrowser.from('installment_plans').select('*').order('updated_at', { ascending: false }).limit(200),
      supabaseBrowser.from('customers').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseBrowser.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(100),
      supabaseBrowser.from('reviews').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseBrowser.from('settings').select('key,value').order('key'),
      supabaseBrowser.from('site_assets').select('*').order('key'),
      supabaseBrowser.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    setProducts((productsResult.data ?? []) as Product[]);
    setOrders(ordersResult.data ?? []);
    setPlans(plansResult.data ?? []);
    setCustomers(customersResult.data ?? []);
    setConversations(conversationsResult.data ?? []);
    setReviews(reviewsResult.data ?? []);
    setSettings((settingsResult.data ?? []) as Setting[]);
    setAssets(assetsResult.data ?? []);
    setAudit(auditResult.data ?? []);

    const firstError = [productsResult, ordersResult, plansResult, customersResult, conversationsResult, reviewsResult, settingsResult, assetsResult, auditResult].find((result) => result.error);
    if (firstError?.error) setError(firstError.error.message);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: loginError } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (loginError || !data.user) {
      setError(loginError?.message ?? 'تعذر تسجيل الدخول.');
      setBusy(false);
      return;
    }
    const { data: admin, error: adminError } = await supabaseBrowser.from('admins').select('id,is_active').eq('id', data.user.id).maybeSingle();
    if (adminError || !admin?.is_active) {
      await supabaseBrowser.auth.signOut();
      setError('الحساب غير مخول لإدارة المتجر.');
      setBusy(false);
      return;
    }
    setMode('dashboard');
    await loadAll();
    setBusy(false);
  }

  async function logout() {
    await supabaseBrowser.auth.signOut();
    setMode('login');
  }

  async function saveProduct(id: string, patch: Partial<Product>) {
    setSaving(true);
    const { data, error: saveError } = await supabaseBrowser.from('products').update(patch).eq('id', id).select('id,name,model,price_usd,price_syp,stock_quantity,stock_status,is_active,is_featured,slug').single();
    if (saveError || !data) setError(saveError?.message ?? 'تعذر حفظ المنتج.');
    else setProducts((current) => current.map((item) => item.id === id ? data as Product : item));
    setSaving(false);
  }

  async function saveSetting(key: string, value: Record<string, any>) {
    setSaving(true);
    const { data, error: saveError } = await supabaseBrowser.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }).select('key,value').single();
    if (saveError || !data) setError(saveError?.message ?? 'تعذر حفظ الإعداد.');
    else setSettings((current) => [...current.filter((item) => item.key !== key), data as Setting]);
    setSaving(false);
  }

  async function saveOrder(id: string, status: string) {
    setSaving(true);
    const { data, error: saveError } = await supabaseBrowser.from('orders').update({ status }).eq('id', id).select('*').single();
    if (saveError || !data) setError(saveError?.message ?? 'تعذر تحديث الطلب.');
    else setOrders((current) => current.map((item) => item.id === id ? data : item));
    setSaving(false);
  }

  async function toggleReview(id: string, value: boolean) {
    const { error: updateError } = await supabaseBrowser.from('reviews').update({ is_approved: value }).eq('id', id);
    if (updateError) setError(updateError.message);
    else setReviews((current) => current.map((item) => item.id === id ? { ...item, is_approved: value } : item));
  }

  if (mode === 'login') {
    return (
      <main className={styles.page}>
        <div className={`${styles.card} ${styles.loginCard}`}>
          <div className="eyebrow">LOUAY PHONE · ADMIN</div>
          <h1>لوحة التحكم</h1>
          <p>إدارة المتجر والإعدادات والطلبات من مكان واحد.</p>
          <form className={styles.form} onSubmit={login}>
            <label>البريد الإلكتروني<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
            <label>كلمة المرور<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
            {error && <div className={styles.error} role="alert">{error}</div>}
            <button className={`btn btn--dark ${styles.submit}`} disabled={busy}>{busy ? 'جارٍ الدخول…' : 'دخول'}</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><div className="eyebrow">LOUAY PHONE · CONTROL CENTER</div><h1>إدارة المتجر</h1><p>التحكم بالمنتجات والصور والأسعار والطلبات والمحتوى والإعدادات.</p></div>
          <div className={styles.headerActions}><Link href="/" className="btn btn--link">فتح المتجر</Link><button className="btn btn--dark" onClick={logout}>خروج</button></div>
        </header>
        <nav className={styles.tabs} aria-label="أقسام الإدارة">
          {tabs.map(([id, label]) => <button key={id} className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`} onClick={() => { setTab(id); setQuery(''); }}>{label}</button>)}
        </nav>
        {error && <div className={styles.error} role="alert">{error}</div>}

        {tab === 'products' && (
          <section>
            <div className={styles.toolbar}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن هاتف أو موديل…" /><span>{filteredProducts.length} منتج</span></div>
            <div className={styles.products}>{filteredProducts.map((product) => (
              <article className={styles.row} key={product.id}>
                <div className={styles.main}><strong>{product.name}</strong><span>{product.model || 'بدون موديل'}</span></div>
                <label>USD<input value={product.price_usd ?? ''} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, price_usd: event.target.value === '' ? null : Number(event.target.value) } : item))} onBlur={() => saveProduct(product.id, { price_usd: product.price_usd })} /></label>
                <label>المخزون<input value={product.stock_quantity} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock_quantity: Number(event.target.value || 0) } : item))} onBlur={() => saveProduct(product.id, { stock_quantity: product.stock_quantity })} /></label>
                <label>الظهور<button className={`${styles.toggle} ${product.is_active ? styles.toggleOn : ''}`} disabled={saving} onClick={() => saveProduct(product.id, { is_active: !product.is_active })}>{product.is_active ? 'ظاهر' : 'مخفي'}</button></label>
                <label>مميز<button className={`${styles.toggle} ${product.is_featured ? styles.toggleFeatured : ''}`} disabled={saving} onClick={() => saveProduct(product.id, { is_featured: !product.is_featured })}>{product.is_featured ? 'مميز' : 'عادي'}</button></label>
                <Link className="btn btn--link" href={`/admin/media/${product.id}`}>إدارة الصور</Link>
              </article>
            ))}</div>
          </section>
        )}

        {tab === 'orders' && <section className={styles.list}>{orders.map((order) => <article className={styles.panelRow} key={order.id}><div><strong>طلب {String(order.id).slice(0, 8)}</strong><span>{order.product_id ? productMap.get(order.product_id)?.name || 'منتج' : '—'}</span></div><span>{order.total_amount ?? '—'}</span><select value={order.status} onChange={(event) => saveOrder(order.id, event.target.value)} disabled={saving}><option value="new">جديد</option><option value="reviewing">قيد المراجعة</option><option value="contacted">تم التواصل</option><option value="confirmed">مؤكد</option><option value="cancelled">ملغى</option></select></article>)}</section>}

        {tab === 'installments' && <section className={styles.list}>{plans.map((plan) => <article className={styles.panelRow} key={plan.id}><div><strong>{productMap.get(plan.product_id)?.name || String(plan.product_id).slice(0, 8)}</strong><span>{plan.months} شهر · {plan.first_payment_type === 'percentage' ? 'نسبة' : 'مبلغ'} {plan.first_payment_value}</span></div><span>شهري {plan.monthly_amount ?? '—'}</span><button className={`${styles.toggle} ${plan.is_active ? styles.toggleOn : ''}`} onClick={async () => { const { error: updateError } = await supabaseBrowser.from('installment_plans').update({ is_active: !plan.is_active }).eq('id', plan.id); if (updateError) setError(updateError.message); else setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, is_active: !item.is_active } : item)); }}>{plan.is_active ? 'مفعل' : 'متوقف'}</button></article>)}</section>}

        {tab === 'customers' && <section className={styles.list}>{customers.map((customer) => <article className={styles.panelRow} key={customer.id}><div><strong>{customer.name}</strong><span>{customer.phone}</span></div><span>{customer.address || 'بدون عنوان'}</span><span>{customer.telegram_username ? `@${customer.telegram_username}` : '—'}</span></article>)}</section>}

        {tab === 'conversations' && <section className={styles.list}>{conversations.map((conversation) => <article className={styles.panelRow} key={conversation.id}><div><strong>{conversation.ticket_code || String(conversation.id).slice(0, 8)}</strong><span>{conversation.visitor_name || 'زائر'}</span></div><span>{conversation.status}</span><span>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString('ar-SY') : '—'}</span></article>)}</section>}

        {tab === 'reviews' && <section className={styles.list}>{reviews.map((review) => <article className={styles.panelRow} key={review.id}><div><strong>{review.customer_name}</strong><span>{productMap.get(review.product_id)?.name || 'منتج'}</span></div><span>{'★'.repeat(Number(review.rating) || 0)}{'☆'.repeat(5 - (Number(review.rating) || 0))}</span><button className={`${styles.toggle} ${review.is_approved ? styles.toggleOn : ''}`} onClick={() => toggleReview(review.id, !review.is_approved)}>{review.is_approved ? 'معروض' : 'قيد المراجعة'}</button></article>)}</section>}

        {tab === 'homepage' && <section className={styles.grid}><div className={styles.card}><div className="eyebrow">HERO</div><h2>اختيار صورة البطل</h2><select value={showcase.hero_product_id || ''} onChange={(event) => saveSetting('homepage_showcase', { ...showcase, hero_product_id: event.target.value || null })}><option value="">اختيار تلقائي</option>{products.filter((product) => product.is_active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><p>اختر المنتج الذي يقود الصفحة الرئيسية.</p></div><div className={styles.card}><div className="eyebrow">FEATURED</div><h2>الهواتف المميزة</h2><div className={styles.checkGrid}>{products.filter((product) => product.is_active).slice(0, 80).map((product) => { const ids: string[] = showcase.featured_product_ids || []; const checked = ids.includes(product.id); return <label key={product.id} className={styles.check}><input type="checkbox" checked={checked} onChange={(event) => { const next = event.target.checked ? [...ids, product.id] : ids.filter((id) => id !== product.id); if (next.length <= 6) void saveSetting('homepage_showcase', { ...showcase, featured_product_ids: next }); }} /><span>{product.name}</span></label>; })}</div></div></section>}

        {tab === 'settings' && <section className={styles.settingsGrid}><div className={styles.card}><div className="eyebrow">STORE</div><h2>معلومات المتجر</h2><label>اسم المتجر<input defaultValue={store.name || 'Louay Phone'} onBlur={(event) => saveSetting('store', { ...store, name: event.target.value })} /></label><label>العملة الأساسية<input defaultValue={store.currency || 'SYP'} onBlur={(event) => saveSetting('store', { ...store, currency: event.target.value.toUpperCase() })} /></label><label>العملة الثانوية<input defaultValue={store.secondary_currency || 'USD'} onBlur={(event) => saveSetting('store', { ...store, secondary_currency: event.target.value.toUpperCase() })} /></label></div><div className={styles.card}><div className="eyebrow">EXCHANGE RATE</div><h2>سعر الصرف</h2><p>تعديل إداري فقط، ولا يغيّر أسعار المنتجات المخزنة تلقائيًا.</p><label>قيمة USD<input id="admin-exchange-rate" defaultValue={exchange.usd_to_syp ?? ''} inputMode="decimal" /></label><span>{store.currency || 'SYP'} لكل 1 USD</span><button className="btn btn--dark" onClick={() => saveSetting('exchange_rate', { usd_to_syp: Number((document.getElementById('admin-exchange-rate') as HTMLInputElement)?.value || 0) })} disabled={saving}>حفظ سعر الصرف</button></div></section>}

        {tab === 'assets' && <section className={styles.list}>{assets.map((asset) => <article className={styles.panelRow} key={asset.key}><div><strong>{asset.key}</strong><span>{asset.mime_type || 'asset'}</span></div><a href={asset.url} target="_blank" rel="noreferrer" className="btn btn--link">فتح الأصل</a></article>)}</section>}

        {tab === 'audit' && <section className={styles.list}>{audit.map((entry) => <article className={styles.panelRow} key={entry.id}><div><strong>{entry.action || 'عملية'}</strong><span>{entry.entity || '—'}</span></div><span>{entry.entity_id || '—'}</span><span>{entry.created_at ? new Date(entry.created_at).toLocaleString('ar-SY') : '—'}</span></article>)}</section>}
      </div>
    </main>
  );
}

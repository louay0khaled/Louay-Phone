'use client';

import { useEffect, useMemo, useState } from 'react';
import { track } from '@vercel/analytics';

type Plan = { id: string; months: number; first_payment_type: 'fixed' | 'percentage'; first_payment_value: number; total_price: number | null; monthly_amount: number | null };
const TOKEN_KEY = 'louay_phone_chat_token';
const draftKey = (productId: string) => `louay_order_draft:${productId}`;

type Draft = { planId: string; name: string; phone: string; address: string; notes: string };

export default function OrderForm({ product, plans }: { product: any; plans: Plan[] }) {
  const [planId, setPlanId] = useState(''); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [address, setAddress] = useState(''); const [notes, setNotes] = useState(''); const [website, setWebsite] = useState(''); const [loading, setLoading] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const plan = useMemo(() => plans.find((x) => x.id === planId), [plans, planId]); const money = (v: number) => Number(v || 0).toLocaleString('ar-SY');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(product.id));
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      setPlanId(draft.planId || ''); setName(draft.name || ''); setPhone(draft.phone || ''); setAddress(draft.address || ''); setNotes(draft.notes || '');
    } catch {}
    void track('order_form_viewed', { product: String(product.name ?? product.id) });
  }, [product.id, product.name]);

  useEffect(() => {
    try {
      const draft: Draft = { planId, name, phone, address, notes };
      const hasValue = Object.values(draft).some(Boolean);
      if (hasValue) localStorage.setItem(draftKey(product.id), JSON.stringify(draft));
    } catch {}
  }, [product.id, planId, name, phone, address, notes]);

  function clearDraft() { try { localStorage.removeItem(draftKey(product.id)); } catch {} }
  function openChat() { window.dispatchEvent(new Event('louay:open-chat')); }
  async function ensureChatToken() { const existing = localStorage.getItem(TOKEN_KEY); if (existing) return existing; const res = await fetch('/api/chat/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() || undefined }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر تجهيز المحادثة'); localStorage.setItem(TOKEN_KEY, data.token); return data.token as string; }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (website) { setError('تعذر إرسال الطلب.'); return; }
    if (product.installment_enabled && plans.length > 0 && !plan) { setError('اختر مدة التقسيط أولًا.'); return; }
    setLoading(true); setError('');
    try {
      const chatToken = await ensureChatToken();
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, installmentPlanId: plan?.id ?? null, name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim(), chatToken, website }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'تعذر إرسال الطلب، حاول مرة أخرى.');
      clearDraft(); setDone(true); void track('order_submitted', { product: String(product.name ?? product.id), installment: Boolean(plan) });
    } catch (err: any) { setError(err?.message || 'تعذر إرسال الطلب، حاول مرة أخرى.'); } finally { setLoading(false); }
  }

  if (done) return <div className="glass reveal-up mt-8 overflow-hidden rounded-[1.7rem] p-6 text-white"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-xl text-emerald-300">✓</div><h2 className="mt-5 text-2xl font-black">تم استلام طلبك بنجاح</h2><p className="mt-2 text-sm leading-7 text-slate-400">وصلنا طلبك، وسنتواصل معك لمتابعة التفاصيل وتأكيده.</p><button type="button" onClick={openChat} className="luxury-button mt-5">تحدث معنا الآن</button></div>;

  return <div className="glass reveal-up mt-8 overflow-hidden rounded-[1.7rem] p-5 text-white sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="luxury-badge">ORDER</div><h2 className="mt-3 text-2xl font-black tracking-tight">اطلب الآن</h2><p className="mt-1 text-sm text-slate-400">أكمل البيانات وسنتابع طلبك معك مباشرة. ستُحفظ بياناتك مؤقتًا على جهازك إذا خرجت قبل الإرسال.</p></div><button type="button" onClick={openChat} className="luxury-button-secondary shrink-0">لديك استفسار؟ تحدث معنا</button></div>
    {product.installment_enabled && plans.length > 0 && <div className="mt-7"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">اختر مدة التقسيط</p><span className="text-xs text-slate-500">خيارات متاحة</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{plans.map((p) => <button type="button" key={p.id} onClick={() => setPlanId(p.id)} aria-pressed={planId === p.id} className={`min-h-12 rounded-2xl border px-4 text-sm font-extrabold transition ${planId === p.id ? 'border-sky-200/60 bg-sky-400 text-slate-950 shadow-[0_12px_35px_rgba(14,165,233,.22)]' : 'border-white/10 bg-white/[.03] text-slate-300 hover:border-sky-300/30 hover:bg-sky-400/[.06]'}`}>{p.months} أشهر</button>)}</div>{plan && <div className="mt-4 grid gap-3 rounded-2xl border border-sky-300/10 bg-sky-400/[.06] p-4 sm:grid-cols-3"><div><span className="text-[11px] text-slate-500">الدفعة الأولى</span><b className="mt-1 block text-sm text-sky-200">{money(plan.first_payment_type === 'percentage' ? Number(product.price_syp || 0) * Number(plan.first_payment_value) / 100 : plan.first_payment_value)} ل.س</b></div><div><span className="text-[11px] text-slate-500">القسط الشهري</span><b className="mt-1 block text-sm text-sky-200">{money(plan.monthly_amount ?? ((Number(plan.total_price ?? product.price_syp) - Number(plan.first_payment_type === 'percentage' ? Number(product.price_syp || 0) * Number(plan.first_payment_value) / 100 : plan.first_payment_value)) / Number(plan.months)))} ل.س</b></div><div><span className="text-[11px] text-slate-500">المدة</span><b className="mt-1 block text-sm text-slate-200">{plan.months} أشهر</b></div></div>}</div>}
    <form onSubmit={submit} className="mt-7 space-y-3.5">
      <label className="block"><span className="sr-only">الاسم الكامل</span><input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="luxury-input" /></label>
      <label className="block"><span className="sr-only">رقم الهاتف</span><input autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف" inputMode="tel" className="luxury-input" /></label>
      <label className="block"><span className="sr-only">العنوان أو المدينة</span><input autoComplete="street-address" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان / المدينة" className="luxury-input" /></label>
      <label className="block"><span className="sr-only">ملاحظات إضافية</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)" rows={3} className="luxury-input resize-none" /></label>
      <label className="absolute -z-10 h-px w-px overflow-hidden opacity-0" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      {error && <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-300">{error}</p>}
      <button disabled={loading} aria-disabled={loading} className="luxury-button w-full !min-h-14 !rounded-2xl !text-base">{loading ? 'جارٍ إرسال الطلب...' : 'تأكيد الطلب — الدفع عند الاستلام'}</button>
    </form>
  </div>;
}

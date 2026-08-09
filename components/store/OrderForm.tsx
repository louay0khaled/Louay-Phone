'use client';

import { useMemo, useState } from 'react';

type Plan = {
  id: string;
  months: number;
  first_payment_type: 'fixed' | 'percentage';
  first_payment_value: number;
  total_price: number | null;
  monthly_amount: number | null;
};

const TOKEN_KEY = 'louay_phone_chat_token';

export default function OrderForm({ product, plans }: { product: any; plans: Plan[] }) {
  const [planId, setPlanId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const plan = useMemo(() => plans.find((x) => x.id === planId), [plans, planId]);
  const money = (v: number) => Number(v || 0).toLocaleString('ar-SY');

  function openChat() {
    window.dispatchEvent(new Event('louay:open-chat'));
  }

  async function ensureChatToken() {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const res = await fetch('/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || undefined }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'تعذر تجهيز المحادثة');
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.token as string;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (product.installment_enabled && plans.length > 0 && !plan) {
      setError('اختر مدة التقسيط أولًا.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const chatToken = await ensureChatToken();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          installmentPlanId: plan?.id ?? null,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          chatToken,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'تعذر إرسال الطلب، حاول مرة أخرى.');
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال الطلب، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-xl shadow-sky-950/20">
        <div className="mb-3 inline-flex rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-300">✓ تم التأكيد</div>
        <h2 className="text-xl font-black">تم استلام طلبك بنجاح</h2>
        <p className="mt-2 text-sm text-slate-300">سنتواصل معك لمتابعة الطلب وتأكيد التفاصيل.</p>
        <button type="button" onClick={openChat} className="mt-5 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400">
          تحدث معنا الآن
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-sky-400/15 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-5 text-white shadow-xl shadow-sky-950/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">اطلب الآن</h2>
          <p className="mt-1 text-xs text-slate-400">أكمل بياناتك وسنتابع طلبك معك مباشرة.</p>
        </div>
        <button type="button" onClick={openChat} className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-400/20">
          لديك استفسار؟ تحدث معنا
        </button>
      </div>

      {product.installment_enabled && plans.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold">اختر عدد الأشهر</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plans.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                  planId === p.id
                    ? 'border-sky-300 bg-sky-500 text-white shadow-lg shadow-sky-500/15'
                    : 'border-white/10 bg-white/[.03] text-slate-300 hover:border-sky-300/40'
                }`}
              >
                {p.months} أشهر
              </button>
            ))}
          </div>
          {plan && (
            <div className="mt-4 rounded-2xl border border-sky-300/10 bg-sky-400/10 p-4 text-sm text-slate-200">
              <p>
                الدفعة الأولى: <b className="text-sky-300">{money(plan.first_payment_type === 'percentage' ? Number(product.price_syp || 0) * Number(plan.first_payment_value) / 100 : plan.first_payment_value)} ل.س</b>
              </p>
              <p className="mt-1">
                القسط الشهري: <b className="text-sky-300">{money(plan.monthly_amount ?? ((Number(plan.total_price ?? product.price_syp) - Number(plan.first_payment_type === 'percentage' ? Number(product.price_syp || 0) * Number(plan.first_payment_value) / 100 : plan.first_payment_value)) / Number(plan.months)))} ل.س</b>
              </p>
              <p className="mt-1">
                المدة: <b>{plan.months} أشهر</b>
              </p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white caret-sky-300 outline-none placeholder:text-slate-500 focus:border-sky-400" />
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white caret-sky-300 outline-none placeholder:text-slate-500 focus:border-sky-400" />
        <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان / المدينة" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white caret-sky-300 outline-none placeholder:text-slate-500 focus:border-sky-400" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)" rows={3} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white caret-sky-300 outline-none placeholder:text-slate-500 focus:border-sky-400" />
        {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={loading} className="w-full rounded-2xl bg-sky-500 px-6 py-4 font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-50">
          {loading ? 'جارٍ إرسال الطلب...' : 'تأكيد الطلب — الدفع عند الاستلام'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [rate, setRate] = useState('');
  const [saved, setSaved] = useState(false);
  return <main className="min-h-screen bg-[#030712] text-white luxury-grid"><div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
    <a href="/admin" className="text-sm text-sky-400">← لوحة الإدارة</a><h1 className="mt-6 text-3xl font-extrabold">إعدادات المتجر</h1>
    <section className="glass mt-8 rounded-3xl p-7"><h2 className="text-xl font-extrabold">سعر الصرف اليومي</h2><p className="mt-2 text-sm leading-7 text-slate-400">أدخل قيمة الدولار بالليرة السورية. سيتم اعتمادها كأساس لتحويل أسعار المنتجات عند الحاجة.</p><label className="mt-6 block text-sm font-semibold">1 دولار أمريكي =</label><input value={rate} onChange={e=>setRate(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-sky-400" placeholder="مثال: 13400" /><button onClick={()=>setSaved(true)} className="mt-5 rounded-xl bg-sky-400 px-6 py-3 font-extrabold text-slate-950">حفظ سعر الصرف</button>{saved && <p className="mt-4 text-sm text-emerald-300">تم تجهيز القيمة للحفظ في Supabase عند اكتمال ربط الإعدادات.</p>}</section>
    <section className="glass mt-5 rounded-3xl p-7"><h2 className="text-xl font-extrabold">الوصول إلى الإدارة</h2><p className="mt-2 text-sm leading-7 text-slate-400">يدخل المسؤولون من صفحة الدخول الخاصة بالإدارة، ولا يحتاج الزبون لأي حساب.</p><div className="mt-4 rounded-xl bg-black/20 p-4 font-mono text-sm text-sky-300">/admin/login</div></section>
  </div></main>;
}

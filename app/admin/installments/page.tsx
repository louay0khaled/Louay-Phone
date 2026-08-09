'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, Trash2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Product = { id: string; name: string; price_syp: number | null; price_usd: number | null; installment_enabled: boolean };
type Plan = { id: string; product_id: string; months: number; first_payment_type: 'fixed' | 'percentage'; first_payment_value: number; total_price: number | null; monthly_amount: number | null; is_active: boolean };

export default function InstallmentsAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    const [{ data: ps, error: pe }, { data: pls, error: ple }] = await Promise.all([
      supabase.from('products').select('id,name,price_syp,price_usd,installment_enabled').order('name'),
      supabase.from('installment_plans').select('*').order('months'),
    ]);
    if (pe || ple) setError(pe?.message || ple?.message || 'تعذر تحميل خطط التقسيط.');
    setProducts(ps || []); setPlans(pls || []); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(plan: Plan) {
    const { error: e } = await supabase.from('installment_plans').update({ is_active: !plan.is_active, updated_at: new Date().toISOString() }).eq('id', plan.id);
    if (e) setError(e.message); else setPlans(v => v.map(x => x.id === plan.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function remove(plan: Plan) {
    if (!confirm('حذف خطة التقسيط؟')) return;
    const { error: e } = await supabase.from('installment_plans').delete().eq('id', plan.id);
    if (e) setError(e.message); else setPlans(v => v.filter(x => x.id !== plan.id));
  }

  const productMap = new Map(products.map(p => [p.id, p]));

  return <main dir="rtl" className="min-h-screen bg-[#030712] text-white luxury-grid">
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-300"><ArrowRight size={16}/> لوحة الإدارة</Link><p className="text-sm font-bold text-sky-400">LOUAY PHONE</p><h1 className="mt-1 text-3xl font-black">إدارة التقسيط</h1><p className="mt-2 text-sm text-slate-400">إدارة خطط التقسيط المرتبطة بكل هاتف. الإضافة التفصيلية تتم من محرر الهاتف.</p></div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold"><RefreshCw size={16}/> تحديث</button>
      </div>
      {error && <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{error}</div>}
      {loading ? <div className="rounded-3xl border border-white/10 bg-white/[.03] p-10 text-center text-slate-400">جارٍ تحميل الخطط...</div> : <div className="grid gap-5">
        {plans.map(plan => { const p = productMap.get(plan.product_id); return <div key={plan.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-lg font-black">{p?.name || 'هاتف محذوف'}</div><div className="mt-1 text-sm text-slate-500">{plan.months} أشهر · {p?.price_syp ? `${Number(p.price_syp).toLocaleString('ar-SY')} ل.س` : 'السعر غير محدد'}</div></div><div className="flex gap-2"><button onClick={() => toggle(plan)} className={`rounded-xl px-3 py-2 text-xs font-bold ${plan.is_active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>{plan.is_active ? 'مفعّلة' : 'معطّلة'}</button><button onClick={() => remove(plan)} className="rounded-xl bg-red-400/10 px-3 py-2 text-red-300"><Trash2 size={16}/></button></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-black/20 p-4"><div className="text-xs text-slate-500">الدفعة الأولى</div><div className="mt-1 font-bold">{plan.first_payment_type === 'percentage' ? `${plan.first_payment_value}%` : `${Number(plan.first_payment_value).toLocaleString('ar-SY')} ل.س`}</div></div><div className="rounded-2xl bg-black/20 p-4"><div className="text-xs text-slate-500">القسط الشهري</div><div className="mt-1 font-bold">{Number(plan.monthly_amount || 0).toLocaleString('ar-SY')} ل.س</div></div><div className="rounded-2xl bg-black/20 p-4"><div className="text-xs text-slate-500">إجمالي سعر التقسيط</div><div className="mt-1 font-bold">{Number(plan.total_price || 0).toLocaleString('ar-SY')} ل.س</div></div></div>
        </div>; })}
        {!plans.length && <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center"><Calculator className="mx-auto text-sky-300" size={32}/><h2 className="mt-4 font-black">لا توجد خطط تقسيط</h2><p className="mt-2 text-sm text-slate-500">افتح أي هاتف من قسم المنتجات وأضف خطته من محرر الهاتف.</p><Link href="/admin/products" className="mt-5 inline-block rounded-xl bg-sky-400 px-5 py-3 font-bold text-slate-950">إدارة الهواتف</Link></div>}
      </div>}
    </div>
  </main>;
}

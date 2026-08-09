'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({name:'',brand:'',model:'',slug:'',description:'',price_usd:'',price_syp:'',stock_quantity:'0',stock_status:'in_stock',is_featured:false,installment_enabled:false,specs:'{}'});
  const set = (key:string, value:string|boolean) => setForm(v => ({...v,[key]:value}));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const supabase = createClient();
    try {
      let brandId: string | null = null;
      if (form.brand.trim()) {
        const slug = form.brand.trim().toLowerCase().replace(/\s+/g,'-');
        const { data, error } = await supabase.from('brands').upsert({name:form.brand.trim(),slug},{onConflict:'slug'}).select('id').single();
        if (error) throw error; brandId = data.id;
      }
      let specs: Record<string,string> = {};
      try { specs = JSON.parse(form.specs || '{}'); } catch { throw new Error('المواصفات يجب أن تكون بصيغة JSON صحيحة.'); }
      const { data, error } = await supabase.from('products').insert({name:form.name.trim(),brand_id:brandId,model:form.model.trim()||null,slug:(form.slug.trim()||form.name.trim()).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,'-').replace(/^-|-$/g,''),description:form.description.trim()||null,price_usd:form.price_usd?Number(form.price_usd):null,price_syp:form.price_syp?Number(form.price_syp):null,stock_quantity:Number(form.stock_quantity)||0,stock_status:form.stock_status,is_active:true,is_featured:form.is_featured,installment_enabled:form.installment_enabled,specs}).select('id').single();
      if (error) throw error;
      router.push(`/admin/products/${data.id}`);
    } catch (e:any) { setError(e?.message || 'تعذر حفظ الهاتف.'); setSaving(false); }
  }
  return <section className="p-6 lg:p-10" dir="rtl"><div className="mb-8"><p className="text-sm text-sky-300">كتالوج Louay Phone</p><h1 className="mt-2 text-3xl font-black">إضافة هاتف جديد</h1></div><form onSubmit={submit} className="max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-white/[.03] p-6 lg:p-8"><div className="grid gap-5 md:grid-cols-2">{[['name','اسم الهاتف'],['brand','الماركة'],['model','الموديل'],['slug','الرابط المختصر'],['price_usd','السعر بالدولار'],['price_syp','السعر بالليرة'],['stock_quantity','الكمية']].map(([key,label])=><label key={key} className="space-y-2 text-sm"><span className="text-slate-300">{label}</span><input value={String(form[key as keyof typeof form])} onChange={e=>set(key,e.target.value)} required={key==='name'} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-sky-400"/></label>)}<label className="space-y-2 text-sm"><span>حالة المخزون</span><select value={form.stock_status} onChange={e=>set('stock_status',e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"><option value="in_stock">متوفر</option><option value="out_of_stock">غير متوفر</option><option value="coming_soon">قريبًا</option></select></label></div><label className="block space-y-2 text-sm"><span>الوصف</span><textarea rows={5} value={form.description} onChange={e=>set('description',e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"/></label><label className="block space-y-2 text-sm"><span>المواصفات بصيغة JSON</span><textarea rows={8} value={form.specs} onChange={e=>set('specs',e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm" placeholder='{"الشاشة":"6.7 بوصة","المعالج":"..."}'/></label><div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={e=>set('is_featured',e.target.checked)}/> هاتف مميز</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.installment_enabled} onChange={e=>set('installment_enabled',e.target.checked)}/> متاح للتقسيط</label></div>{error&&<p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}<button disabled={saving} className="rounded-xl bg-sky-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-50">{saving?'جارٍ الحفظ...':'حفظ الهاتف'}</button></form></section>;
}

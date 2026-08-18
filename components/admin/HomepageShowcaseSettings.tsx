'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  slug: string;
  model?: string | null;
  stock_status?: string | null;
  price_usd?: number | null;
  image?: string | null;
  brand?: string | null;
};

type Props = {
  products: Product[];
  initialHeroId: string;
  initialFeaturedIds: string[];
  saveAction: (formData: FormData) => Promise<void>;
};

export default function HomepageShowcaseSettings({ products, initialHeroId, initialFeaturedIds, saveAction }: Props) {
  const [query, setQuery] = useState('');
  const [heroId, setHeroId] = useState(initialHeroId);
  const [featuredIds, setFeaturedIds] = useState(initialFeaturedIds.filter((id) => products.some((p) => p.id === id)).slice(0, 6));
  const [dragId, setDragId] = useState<string | null>(null);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? products.filter((p) => `${p.name} ${p.model ?? ''} ${p.brand ?? ''}`.toLowerCase().includes(q)) : products; }, [products, query]);
  function toggleFeatured(id: string) { setFeaturedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : current.length >= 6 ? current : [...current, id]); }
  function reorder(targetId: string) { if (!dragId || dragId === targetId) return; setFeaturedIds((current) => { const next = [...current]; const from = next.indexOf(dragId); const to = next.indexOf(targetId); if (from < 0 || to < 0) return current; next.splice(from, 1); next.splice(to, 0, dragId); return next; }); setDragId(null); }
  const hero = products.find((p) => p.id === heroId) ?? null;
  const featured = featuredIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
  return <section className="admin-showcase glass mt-5 rounded-[2rem] p-6 sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="luxury-badge">HOMEPAGE CONTROL</span><h2 className="mt-3 text-2xl font-black tracking-tight">الواجهة الرئيسية</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">اختَر المنتج البطولي، ثم حدّد حتى 6 منتجات مميزة ورتّبها بالسحب. التغييرات تنعكس على المتجر بعد الحفظ.</p></div><div className="rounded-2xl border border-sky-300/10 bg-sky-400/[.04] px-4 py-3 text-xs text-slate-300"><b className="text-sky-300">{featuredIds.length}/6</b> منتجات مميزة</div></div>
    <div className="mt-7 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
      <div className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-black">Hero المنتج</h3><p className="mt-1 text-xs text-slate-500">هذا المنتج يظهر كعنصر رئيسي أعلى الصفحة.</p></div>{hero && <span className="text-xs font-bold text-emerald-300">محدد</span>}</div>
        <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0b1016]"><div className="relative aspect-[1.1]">{hero?.image ? <Image src={hero.image} alt={hero.name} fill sizes="(max-width: 1280px) 100vw, 420px" className="object-contain p-8" /> : <div className="grid h-full place-items-center text-sm text-slate-600">اختر منتجًا من القائمة</div>}</div><div className="border-t border-white/10 p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-sky-300">اختيار اليوم</p><p className="mt-1 text-lg font-black">{hero?.name ?? 'لم يتم اختيار Hero'}</p><p className="mt-1 text-xs text-slate-500">{hero?.brand ?? '—'}{hero?.model ? ` · ${hero.model}` : ''}</p></div></div>
        <select value={heroId} onChange={(e) => setHeroId(e.target.value)} className="luxury-input mt-4" aria-label="اختيار منتج Hero"><option value="">بدون Hero مخصص</option>{products.map((p) => <option key={p.id} value={p.id}>{p.brand ? `${p.brand} — ` : ''}{p.name}{p.model ? ` — ${p.model}` : ''}</option>)}</select>
      </div>
      <div className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black">الهواتف المميزة</h3><p className="mt-1 text-xs text-slate-500">اسحب البطاقات لتحديد ترتيب الظهور على الصفحة الرئيسية.</p></div><input value={query} onChange={(e) => setQuery(e.target.value)} className="luxury-input sm:max-w-[250px]" placeholder="ابحث عن هاتف أو ماركة…" aria-label="البحث عن الهواتف" /></div>
        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-white/[.06] bg-white/[.02] p-3">{featured.length ? featured.map((p, index) => <div key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => reorder(p.id)} className="flex items-center gap-2 rounded-xl border border-sky-300/15 bg-sky-400/[.05] px-3 py-2 text-xs text-slate-200 cursor-grab active:cursor-grabbing"><span className="grid h-5 w-5 place-items-center rounded-full bg-sky-400/10 text-[10px] font-black text-sky-300">{index + 1}</span><span className="max-w-[150px] truncate font-bold">{p.name}</span><button type="button" onClick={() => toggleFeatured(p.id)} className="text-slate-500 hover:text-red-300" aria-label={`إزالة ${p.name}`}>×</button></div>) : <p className="text-xs text-slate-600">لم تختر أي منتجات بعد.</p>}</div>
        <div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{filtered.map((p) => { const selected = featuredIds.includes(p.id); return <button key={p.id} type="button" onClick={() => toggleFeatured(p.id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-right transition ${selected ? 'border-sky-300/30 bg-sky-400/[.07]' : 'border-white/[.07] bg-white/[.02] hover:border-white/15 hover:bg-white/[.04]'}`}><div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#0b1016]">{p.image ? <Image src={p.image} alt="" fill sizes="56px" className="object-contain p-1" /> : null}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{p.name}</p><p className="mt-1 truncate text-[11px] text-slate-500">{p.brand ?? 'بدون ماركة'}{p.model ? ` · ${p.model}` : ''}</p></div><span className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${selected ? 'border-sky-300/30 bg-sky-400/15 text-sky-200' : 'border-white/10 text-slate-600'}`}>{selected ? '✓' : '+'}</span></button>; })}</div>
      </div>
    </div>
    <form action={saveAction} className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/[.02] p-5 sm:flex-row sm:items-center sm:justify-between"><input type="hidden" name="hero_product_id" value={heroId} /><input type="hidden" name="featured_product_ids" value={JSON.stringify(featuredIds)} /><div><p className="font-bold">جاهز للنشر؟</p><p className="mt-1 text-xs text-slate-500">سيُحدَّث الـHero والمنتجات المميزة على الواجهة الرئيسية مع تنظيف الكاش.</p></div><button type="submit" className="luxury-button min-h-12 px-6">حفظ إعدادات الصفحة الرئيسية</button></form>
  </section>;
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, ImagePlus, Search, ShieldCheck, Wrench, Loader2 } from 'lucide-react';

type Result = { id: string; name: string; status: string; query?: string; error?: string; source?: string };

export default function ProductImageManager() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [health, setHealth] = useState<{ invalidCount: number; repaired?: number } | null>(null);

  async function repairBroken() {
    setRunning(true); setMessage('جاري فحص صور المنتجات فعليًا…'); setHealth(null);
    try {
      const response = await fetch('/api/admin/products/image-health', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ repair: true }), cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر الفحص.');
      setHealth(data); setMessage(`تم فحص ${data.checkedProducts} منتجًا وإزالة ${data.repaired ?? 0} صورة تالفة.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر الفحص.'); }
    finally { setRunning(false); }
  }

  async function fillBatch() {
    setRunning(true); setResults([]); setMessage('جاري تعبئة الصور الصحيحة على دفعات صغيرة…');
    const all: Result[] = [];
    let offset = 0;
    try {
      for (let pass = 0; pass < 40; pass += 1) {
        const response = await fetch('/api/admin/products/image-auto-fill', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ limit: 3, offset }), cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'تعذر تعبئة الصور.');
        all.push(...(data.results ?? [])); setResults([...all]);
        offset = Number(data.nextOffset ?? offset + 3);
        setMessage(`تمت معالجة ${all.length} منتجًا — أضيفت ${all.filter((x) => x.status === 'imported').length} صورة.`);
        if (!Number(data.processed)) break;
        if (offset >= Number(data.totalMissing ?? 0) + 3) break;
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر تعبئة الصور.'); }
    finally { setRunning(false); }
  }

  return <section dir="rtl" className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-6 shadow-2xl shadow-black/10">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-[10px] font-black tracking-[.18em] text-sky-300">IMAGE OPERATIONS</p><h2 className="mt-2 text-2xl font-black">مركز صور الهواتف</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">نفحص الصور التالفة أولًا، ثم نبحث عن صور صحيحة ونحفظها داخل Storage. الصور التي لا نجد لها تطابقًا موثوقًا لا نعبث بها.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={running} onClick={() => void repairBroken()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-400/[.06] px-4 text-sm font-black text-amber-200 disabled:opacity-50">{running ? <Loader2 size={16} className="animate-spin"/> : <Wrench size={16}/>} فحص وإزالة التالف</button><button type="button" disabled={running} onClick={() => void fillBatch()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-400 px-4 text-sm font-black text-slate-950 disabled:opacity-50">{running ? <Loader2 size={16} className="animate-spin"/> : <ImagePlus size={16}/>} تعبئة الصور الناقصة</button></div>
    </div>
    {message && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/[.07] bg-black/10 p-4 text-sm text-slate-300"><CheckCircle2 size={18} className="shrink-0 text-emerald-300"/>{message}</div>}
    {health && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/[.07] bg-black/10 p-4"><p className="text-xs text-slate-500">صور تالفة تمت إزالتها</p><b className="mt-1 block text-2xl text-amber-300">{health.repaired ?? 0}</b></div><div className="rounded-2xl border border-white/[.07] bg-black/10 p-4"><p className="text-xs text-slate-500">حالة الفحص</p><b className="mt-1 block text-lg text-emerald-300"><ShieldCheck size={18} className="mr-1 inline"/> تم</b></div></div>}
    {results.length > 0 && <div className="mt-5 space-y-2">{results.slice(-15).map((result, index) => <div key={`${result.id}-${index}`} className="flex flex-col gap-2 rounded-2xl border border-white/[.06] bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{result.name}</p><p className="mt-1 text-xs text-slate-500">{result.query || result.error || result.source || '—'}</p></div><span className={`text-xs font-black ${result.status === 'imported' ? 'text-emerald-300' : result.status === 'not_found' ? 'text-amber-300' : 'text-red-300'}`}>{result.status === 'imported' ? 'تم الاستيراد' : result.status === 'not_found' ? 'لم نجد تطابقًا' : 'فشل'}</span></div>)}</div>}
    <div className="mt-5 flex flex-wrap gap-3 text-sm"><Link href="/admin/products" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-slate-300 hover:bg-white/[.04]"><Search size={16}/> إدارة الهواتف</Link><Link href="/admin/settings" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-slate-300 hover:bg-white/[.04]">إعدادات المتجر</Link></div>
  </section>;
}

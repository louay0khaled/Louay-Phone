'use client';

import { useState } from 'react';
import { ImageDown, Loader2, Pause, Play } from 'lucide-react';

export default function AutoFillMissingImages() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [imported, setImported] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  async function start() {
    if (running) return;
    setRunning(true); setMessage('جاري فحص المنتجات الناقصة واستيراد الصور…');
    let guard = 0;
    try {
      while (guard++ < 100) {
        const response = await fetch('/api/admin/product-images/auto-fill?limit=5', { method: 'POST', cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'تعذر تشغيل الاستيراد.');
        const importedNow = (data.results ?? []).filter((item: any) => item.status === 'imported').length;
        setProcessed((value) => value + Number(data.processed || 0));
        setImported((value) => value + importedNow);
        setRemaining(Number(data.remaining || 0));
        setMessage(importedNow ? `تم استيراد ${importedNow} صور في هذه الدفعة.` : 'لم نجد تطابقًا مؤكدًا في هذه الدفعة؛ ستنتقل الأداة للمنتجات التالية.');
        if (!data.processed || Number(data.remaining || 0) <= 0) break;
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      setMessage('انتهى الفحص التلقائي للدفعة الحالية. المنتجات التي لم تجد لها الأداة تطابقًا ستظهر لها إمكانية البحث اليدوي الذكي من محرر المنتج.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إكمال الاستيراد.');
    } finally { setRunning(false); }
  }

  return <div className="mb-5 rounded-[1.5rem] border border-sky-300/10 bg-sky-400/[.025] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div><span className="text-[11px] font-black uppercase tracking-[.16em] text-sky-300">CATALOG IMAGE ENGINE</span><h2 className="mt-2 text-lg font-black">تعبئة الصور الناقصة تلقائيًا</h2><p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500">يعالج المنتجات على دفعات صغيرة، يبحث عن تطابق في GSMArena، ينزّل الصورة إلى Supabase Storage، ثم يربطها بالمنتج. المنتجات التي لا يوجد لها تطابق موثوق لا يتم العبث بها.</p></div>
      <button type="button" onClick={() => void start()} disabled={running} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-300 to-sky-500 px-5 font-black text-slate-950 shadow-lg shadow-sky-500/10 disabled:opacity-60">{running ? <><Loader2 size={18} className="animate-spin"/> جاري العمل…</> : <><Play size={18}/> ابدأ تعبئة الصور</>}</button>
    </div>
    {(processed > 0 || remaining !== null || message) && <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><span className="text-[11px] text-slate-500">تمت المعالجة</span><b className="mt-1 block text-lg">{processed}</b></div><div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><span className="text-[11px] text-slate-500">تم الاستيراد</span><b className="mt-1 block text-lg text-emerald-300">{imported}</b></div><div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><span className="text-[11px] text-slate-500">متبقٍ</span><b className="mt-1 block text-lg text-sky-300">{remaining ?? '—'}</b></div></div>}
    {message && <p className="mt-3 text-xs text-slate-400">{message}</p>}
  </div>;
}

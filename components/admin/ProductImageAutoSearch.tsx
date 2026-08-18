'use client';

import { useState } from 'react';
import { RefreshCw, Search, Check, ExternalLink } from 'lucide-react';

type Candidate = { name: string; pageUrl: string; imageUrl: string; source: string };

export default function ProductImageAutoSearch({ productId }: { productId: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function search() {
    setLoading(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/image-candidates`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر البحث.');
      setCandidates(data.candidates ?? []);
      if (!data.candidates?.length) setMessage('لم نجد صورة موثوقة لهذا المنتج تلقائيًا.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر البحث.'); }
    finally { setLoading(false); }
  }

  async function importImage(candidate: Candidate) {
    setImporting(candidate.imageUrl); setMessage('جاري تنزيل الصورة وحفظها في التخزين…');
    try {
      const response = await fetch(`/api/admin/products/${productId}/image-import`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: candidate.imageUrl, pageUrl: candidate.pageUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر استيراد الصورة.');
      setMessage('تم حفظ الصورة. يمكنك جعلها الرئيسية من الصور الموجودة بالأعلى.');
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر الاستيراد.'); }
    finally { setImporting(null); }
  }

  return <div className="mt-5 rounded-3xl border border-sky-300/10 bg-sky-400/[.025] p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><span className="text-[11px] font-black uppercase tracking-[.16em] text-sky-300">AUTO IMAGE FINDER</span><h3 className="mt-2 font-black">البحث عن صورة مناسبة تلقائيًا</h3><p className="mt-1 text-xs leading-6 text-slate-500">يعرض لك صورًا من GSMArena للمراجعة، ثم يحفظ النسخة داخل Supabase بدل الاعتماد على رابط خارجي.</p></div>
      <button type="button" onClick={() => void search()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-400/15 disabled:opacity-50"><Search size={17}/>{loading ? 'جارٍ البحث…' : 'بحث تلقائي'}</button>
    </div>
    {message && <p className="mt-4 rounded-xl border border-white/[.07] bg-black/10 p-3 text-sm text-slate-300">{message}</p>}
    {candidates.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {candidates.map((candidate) => <div key={candidate.imageUrl} className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
        <div className="relative aspect-[.82] bg-[#0b1016]"><img src={candidate.imageUrl} alt={candidate.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-4" /></div>
        <div className="p-3"><p className="truncate text-sm font-black">{candidate.name}</p><a href={candidate.pageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-sky-300">المصدر <ExternalLink size={12}/></a><button type="button" onClick={() => void importImage(candidate)} disabled={importing !== null} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50">{importing === candidate.imageUrl ? <RefreshCw size={14} className="animate-spin"/> : <Check size={14}/>} {importing === candidate.imageUrl ? 'جارٍ الاستيراد…' : 'استخدم هذه الصورة'}</button></div>
      </div>)}
    </div>}
  </div>;
}

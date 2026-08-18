'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

const surface = 'rounded-[28px] border border-sky-200/15 bg-[linear-gradient(145deg,rgba(255,255,255,.05),rgba(15,23,42,.35),rgba(2,6,23,.72))] shadow-[0_24px_80px_rgba(0,0,0,.24)]';

export function PageLoading({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return <div className={`${surface} mx-auto my-12 flex min-h-[220px] w-full max-w-3xl flex-col items-center justify-center gap-4 p-8 text-slate-300`} role="status" aria-live="polite"><span className="h-7 w-7 animate-spin rounded-full border-2 border-sky-200/20 border-t-sky-300" aria-hidden="true" /><span className="text-sm font-bold">{label}</span></div>;
}

export function EmptyState({ title = 'لا توجد نتائج حاليًا', description, actionHref = '/', actionLabel = 'العودة للرئيسية' }: { title?: string; description?: string; actionHref?: string; actionLabel?: string }) {
  return <section className={`${surface} mx-auto my-12 w-full max-w-3xl p-8 text-center sm:p-14`} aria-labelledby="empty-title"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[18px] border border-sky-200/15 bg-sky-400/[.07] text-xl font-black text-sky-300" aria-hidden="true">✦</div><h2 id="empty-title" className="text-xl font-black tracking-tight">{title}</h2>{description && <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-slate-400">{description}</p>}<Link href={actionHref} className="luxury-button-secondary mt-6">{actionLabel}</Link></section>;
}

export function ErrorState({ title = 'حدث خطأ غير متوقع', description = 'حاول مرة أخرى بعد لحظات.' }: { title?: string; description?: string }) {
  return <section className={`${surface} mx-auto my-12 w-full max-w-3xl p-8 text-center sm:p-14`} role="alert"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[18px] border border-red-200/15 bg-red-400/[.07] text-xl font-black text-red-300" aria-hidden="true">!</div><h2 className="text-xl font-black tracking-tight">{title}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-slate-400">{description}</p><button type="button" className="luxury-button-secondary mt-5" onClick={() => window.location.reload()}>إعادة المحاولة</button></section>;
}

export function ModalFrame({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[200] grid place-items-center p-2 sm:p-5" role="presentation"><button className="absolute inset-0 border-0 bg-black/70 backdrop-blur-[6px] sm:backdrop-blur-[10px]" aria-label="إغلاق" onClick={onClose} /><section className="relative z-10 w-full max-w-2xl max-h-[92svh] overflow-auto rounded-[24px] border border-sky-200/15 bg-slate-950/95 shadow-[0_35px_100px_rgba(0,0,0,.48)] sm:max-h-[86svh] sm:rounded-[28px]" role="dialog" aria-modal="true" aria-label={title}><div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[.07] bg-slate-950/90 px-4 py-3 backdrop-blur-xl sm:px-5"><h2 className="font-black">{title}</h2><button className="grid h-10 w-10 place-items-center rounded-xl border border-sky-200/10 bg-white/[.04] text-xl text-slate-300 transition hover:bg-sky-400/[.08]" type="button" onClick={onClose} aria-label="إغلاق">×</button></div><div className="p-4 sm:p-5">{children}</div></section></div>;
}

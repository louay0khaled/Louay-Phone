'use client';

import { FormEvent, useState } from 'react';

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function ReviewsSection({ productId, reviews }: { productId: string; reviews: Review[] }) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, customerName: name, rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال التقييم');
      setStatus(data.message || 'تم إرسال تقييمك للمراجعة.');
      setName('');
      setComment('');
      setRating(5);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'تعذر إرسال التقييم');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 pb-14" dir="rtl">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-slate-200 p-6 dark:border-white/10">
          <h2 className="text-2xl font-black">آراء الزبائن</h2>
          <div className="mt-5 space-y-4">
            {reviews.length === 0 ? (
              <p className="text-slate-500">لا توجد تقييمات منشورة بعد. كن أول من يشارك رأيه.</p>
            ) : reviews.map((review) => (
              <article key={review.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.04]">
                <div className="flex items-center justify-between gap-3">
                  <strong>{review.customer_name}</strong>
                  <span aria-label={`${review.rating} من 5`} className="text-sm tracking-wide text-sky-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                </div>
                {review.comment && <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{review.comment}</p>}
              </article>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-slate-200 p-6 dark:border-white/10">
          <h2 className="text-2xl font-black">أضف تقييمك</h2>
          <p className="mt-2 text-sm text-slate-500">سيظهر تقييمك بعد مراجعته من الإدارة.</p>
          <label className="mt-5 block text-sm font-bold">الاسم<input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-sky-500 dark:border-white/10" /></label>
          <label className="mt-4 block text-sm font-bold">التقييم<select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none dark:border-white/10"><option value={5}>5 نجوم</option><option value={4}>4 نجوم</option><option value={3}>3 نجوم</option><option value={2}>نجمتان</option><option value={1}>نجمة واحدة</option></select></label>
          <label className="mt-4 block text-sm font-bold">التعليق<textarea maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-sky-500 dark:border-white/10" /></label>
          <button disabled={busy} className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-3 font-black text-white transition hover:bg-sky-600 disabled:opacity-50">{busy ? 'جارٍ الإرسال...' : 'إرسال التقييم'}</button>
          {status && <p role="status" className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/[.04]">{status}</p>}
        </form>
      </div>
    </section>
  );
}

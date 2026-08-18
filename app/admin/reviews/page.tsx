import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/admin/login');
  const { data: admin } = await supabase.from('admins').select('id').eq('id', userId).eq('is_active', true).maybeSingle();
  if (!admin) redirect('/admin/login?error=unauthorized');
  return supabase;
}

async function approveReview(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) return;
  const supabase = await requireAdmin();
  await supabase.from('reviews').update({ is_approved: true }).eq('id', id);
  revalidatePath('/admin/reviews');
}

async function rejectReview(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) return;
  const supabase = await requireAdmin();
  await supabase.from('reviews').delete().eq('id', id);
  revalidatePath('/admin/reviews');
}

export default async function AdminReviewsPage() {
  const supabase = await requireAdmin();
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id,customer_name,rating,comment,is_approved,created_at,products(name)')
    .order('created_at', { ascending: false });

  const allCount = reviews?.length ?? 0;
  const pendingCount = reviews?.filter((review: any) => !review.is_approved).length ?? 0;
  const publishedCount = reviews?.filter((review: any) => review.is_approved).length ?? 0;

  return <section className="p-5 lg:p-10" dir="rtl"><div className="mx-auto max-w-6xl">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black tracking-[.18em] text-sky-300">REVIEW CONTROL</p><h1 className="mt-2 text-3xl font-black">التقييمات</h1><p className="mt-2 text-sm leading-7 text-slate-400">راجع تقييمات الزبائن، انشر المقبول واحذف المحتوى الذي لا تريد ظهوره في المتجر.</p></div><a href="/admin" className="luxury-button-secondary w-fit">← لوحة التحكم</a></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">كل التقييمات</p><b className="mt-1 block text-2xl">{allCount}</b></div><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">بانتظار المراجعة</p><b className="mt-1 block text-2xl text-amber-300">{pendingCount}</b></div><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">منشورة</p><b className="mt-1 block text-2xl text-emerald-300">{publishedCount}</b></div></div>
    {error ? <div className="lp-surface mt-5 rounded-3xl border-red-400/20 p-6 text-red-200">تعذر تحميل التقييمات.</div> : reviews?.length ? <div className="mt-5 space-y-4">{reviews.map((review: any) => <article key={review.id} className="lp-surface rounded-3xl p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-black">{review.customer_name}</h2><p className="mt-1 text-xs text-slate-500">{review.products?.name ?? 'هاتف محذوف'}</p></div><div className="text-sky-300" aria-label={`${review.rating} من 5 نجوم`}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}{'☆'.repeat(Math.max(0, 5 - review.rating))}</div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${review.is_approved ? 'border-emerald-300/15 bg-emerald-400/10 text-emerald-300' : 'border-amber-300/15 bg-amber-400/10 text-amber-300'}`}>{review.is_approved ? 'منشور' : 'بانتظار المراجعة'}</span></div>{review.comment ? <p className="mt-4 leading-7 text-slate-300">{review.comment}</p> : <p className="mt-4 text-sm text-slate-500">بدون تعليق نصي.</p>}<div className="mt-5 flex flex-wrap gap-2">{!review.is_approved ? <form action={approveReview}><input type="hidden" name="id" value={review.id}/><button className="luxury-button" type="submit">نشر التقييم</button></form> : null}<form action={rejectReview}><input type="hidden" name="id" value={review.id}/><button className="luxury-button-secondary !border-red-300/15 !text-red-300" type="submit">حذف</button></form></div></article>)}</div> : <div className="lp-surface mt-5 rounded-3xl p-12 text-center text-slate-500">لا توجد تقييمات حاليًا.</div>}
  </div></section>;
}

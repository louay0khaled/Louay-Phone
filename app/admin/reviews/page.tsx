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
  const id = String(formData.get('id') || '');
  const supabase = await requireAdmin();
  if (!id) return;
  await supabase.from('reviews').update({ is_approved: true }).eq('id', id);
  revalidatePath('/admin/reviews');
}

async function rejectReview(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const supabase = await requireAdmin();
  if (!id) return;
  await supabase.from('reviews').delete().eq('id', id);
  revalidatePath('/admin/reviews');
}

export default async function AdminReviewsPage() {
  const supabase = await requireAdmin();
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id,customer_name,rating,comment,is_approved,created_at,products(name)')
    .order('created_at', { ascending: false });

  return (
    <div className="p-5 lg:p-8" dir="rtl">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div><h1 className="text-3xl font-black">التقييمات</h1><p className="mt-2 text-sm text-slate-400">راجع تقييمات الزبائن قبل نشرها.</p></div>
        <div className="rounded-2xl bg-sky-400/10 px-4 py-2 text-sm text-sky-300">{reviews?.length ?? 0} تقييم</div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-200">تعذر تحميل التقييمات.</div>
      ) : reviews?.length ? (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <article key={review.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-black">{review.customer_name}</h2><p className="mt-1 text-xs text-slate-500">{review.products?.name ?? 'هاتف محذوف'}</p></div>
                <div className="text-sky-300">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                <span className={`rounded-full px-3 py-1 text-xs ${review.is_approved ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{review.is_approved ? 'منشور' : 'بانتظار المراجعة'}</span>
              </div>
              {review.comment && <p className="mt-4 leading-7 text-slate-300">{review.comment}</p>}
              <div className="mt-4 flex gap-2">
                {!review.is_approved && <form action={approveReview}><input type="hidden" name="id" value={review.id}/><button className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-black text-slate-950">نشر التقييم</button></form>}
                <form action={rejectReview}><input type="hidden" name="id" value={review.id}/><button className="rounded-xl border border-red-400/20 px-4 py-2 text-sm font-bold text-red-300">حذف</button></form>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center text-slate-400">لا توجد تقييمات حاليًا.</div>}
    </div>
  );
}

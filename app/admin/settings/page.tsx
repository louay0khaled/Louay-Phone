import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function saveExchangeRate(formData: FormData) {
  'use server';
  const raw = String(formData.get('rate') ?? '').replace(/,/g, '').trim();
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate <= 0) redirect('/admin/settings?error=rate');

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/admin/login');

  const { data: admin } = await supabase.from('admins').select('id').eq('id', claims.claims.sub).eq('is_active', true).maybeSingle();
  if (!admin) redirect('/admin/login?error=unauthorized');

  const { error } = await supabase.from('settings').upsert({ key: 'exchange_rate', value: { usd_to_syp: rate }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) redirect('/admin/settings?error=save');
  revalidatePath('/');
  revalidatePath('/admin/settings');
  redirect('/admin/settings?saved=1');
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle();
  const currentRate = typeof data?.value === 'object' && data?.value && 'usd_to_syp' in data.value ? String((data.value as { usd_to_syp?: number }).usd_to_syp ?? '') : '';

  return <main className="min-h-screen bg-[#030712] text-white luxury-grid"><div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
    <a href="/admin" className="text-sm text-sky-400">← لوحة الإدارة</a><h1 className="mt-6 text-3xl font-extrabold">إعدادات المتجر</h1>
    <section className="glass mt-8 rounded-3xl p-7"><h2 className="text-xl font-extrabold">سعر الصرف اليومي</h2><p className="mt-2 text-sm leading-7 text-slate-400">أدخل قيمة الدولار بالليرة السورية. هذا الرقم هو المرجع اليومي لعرض الأسعار بالليرة.</p><form action={saveExchangeRate}><label className="mt-6 block text-sm font-semibold">1 دولار أمريكي =</label><input name="rate" defaultValue={currentRate} required inputMode="decimal" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-sky-400" placeholder="مثال: 13400" /><button type="submit" className="mt-5 rounded-xl bg-sky-400 px-6 py-3 font-extrabold text-slate-950">حفظ سعر الصرف</button></form>{params.saved === '1' && <p className="mt-4 text-sm text-emerald-300">تم حفظ سعر الصرف في Supabase بنجاح.</p>}{params.error && <p className="mt-4 text-sm text-red-300">تعذر حفظ القيمة. تأكد من الرقم وحاول مجددًا.</p>}</section>
    <section className="glass mt-5 rounded-3xl p-7"><h2 className="text-xl font-extrabold">الوصول إلى الإدارة</h2><p className="mt-2 text-sm leading-7 text-slate-400">يدخل المسؤولون من صفحة الدخول الخاصة بالإدارة، ولا يحتاج الزبون لأي حساب.</p><div className="mt-4 rounded-xl bg-black/20 p-4 font-mono text-sm text-sky-300">/admin/login</div></section>
  </div></main>;
}

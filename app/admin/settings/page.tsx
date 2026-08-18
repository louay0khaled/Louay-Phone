import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import SiteBrandingSettings from '@/components/admin/SiteBrandingSettings';
import HomepageShowcaseSettings from '@/components/admin/HomepageShowcaseSettings';

function parseRate(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '').trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s/g, '').replace(/,/g, '').replace(/٬/g, '').replace(/٫/g, '.').replace(/،/g, '.');
  const rate = Number(normalized);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/admin/login');
  const { data: admin } = await supabase.from('admins').select('id').eq('id', claims.claims.sub).eq('is_active', true).maybeSingle();
  if (!admin) redirect('/admin/login?error=unauthorized');
  return supabase;
}

async function saveExchangeRate(formData: FormData) {
  'use server';
  const rate = parseRate(formData.get('rate'));
  if (rate === null) redirect('/admin/settings?error=rate');
  const supabase = await requireAdmin();
  const { error } = await supabase.from('settings').upsert({ key: 'exchange_rate', value: { usd_to_syp: rate }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) redirect('/admin/settings?error=save');
  revalidatePath('/'); revalidatePath('/products'); revalidatePath('/admin/settings');
  redirect('/admin/settings?saved=1');
}

async function saveHomepageShowcase(formData: FormData) {
  'use server';
  const heroId = String(formData.get('hero_product_id') ?? '').trim();
  let featuredIds: string[] = [];
  try { featuredIds = JSON.parse(String(formData.get('featured_product_ids') ?? '[]')); } catch { redirect('/admin/settings?error=showcase'); }
  featuredIds = Array.isArray(featuredIds) ? [...new Set(featuredIds.filter((id): id is string => typeof id === 'string'))].slice(0, 6) : [];

  const supabase = await requireAdmin();
  const ids = [...new Set([heroId, ...featuredIds].filter(Boolean))];
  if (ids.length) {
    const { data: validProducts, error: validationError } = await supabase.from('products').select('id').in('id', ids).eq('is_active', true);
    if (validationError) redirect('/admin/settings?error=showcase');
    const validIds = new Set((validProducts ?? []).map((row) => row.id));
    if (heroId && !validIds.has(heroId)) redirect('/admin/settings?error=showcase');
    featuredIds = featuredIds.filter((id) => validIds.has(id));
  }

  const { error } = await supabase.from('settings').upsert({ key: 'homepage_showcase', value: { hero_product_id: heroId || null, featured_product_ids: featuredIds }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) redirect('/admin/settings?error=showcase');
  revalidatePath('/'); revalidatePath('/admin/settings');
  redirect('/admin/settings?saved=showcase');
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await requireAdmin();
  const [{ data: rateRow }, { data: showcaseRow }, { data: productRows }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'homepage_showcase').maybeSingle(),
    supabase.from('products').select('id,name,slug,model,stock_status,price_usd,brands(name),product_images(url,alt_text,is_primary,position)').eq('is_active', true).order('created_at', { ascending: false }),
  ]);
  const currentRate = typeof rateRow?.value === 'object' && rateRow?.value && 'usd_to_syp' in rateRow.value ? String((rateRow.value as { usd_to_syp?: number }).usd_to_syp ?? '') : '';
  const showcase = (showcaseRow?.value && typeof showcaseRow.value === 'object' ? showcaseRow.value : {}) as { hero_product_id?: string | null; featured_product_ids?: string[] };
  const products = (productRows ?? []).map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, model: p.model, stock_status: p.stock_status, price_usd: p.price_usd, brand: p.brands?.name ?? null, image: [...(p.product_images ?? [])].sort((a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0))[0]?.url ?? null }));

  return <main className="min-h-screen bg-[#030712] text-white luxury-grid"><div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
    <a href="/admin" className="text-sm text-sky-400">← لوحة الإدارة</a><h1 className="mt-6 text-3xl font-extrabold">إعدادات المتجر</h1>
    <HomepageShowcaseSettings products={products} initialHeroId={showcase.hero_product_id ?? ''} initialFeaturedIds={showcase.featured_product_ids ?? []} saveAction={saveHomepageShowcase} />
    <section className="glass mt-5 rounded-3xl p-7"><h2 className="text-xl font-extrabold">سعر الصرف اليومي</h2><p className="mt-2 text-sm leading-7 text-slate-400">أدخل قيمة الدولار بالليرة السورية. يقبل النظام الأرقام العربية والفاصلة والنقطة، ويستخدم هذا الرقم لتحديث أسعار الهواتف المعروضة بالليرة.</p><form action={saveExchangeRate}><label className="mt-6 block text-sm font-semibold">1 دولار أمريكي =</label><input name="rate" defaultValue={currentRate} required inputMode="decimal" dir="ltr" className="luxury-input mt-2" placeholder="مثال: 13400" /><button type="submit" className="luxury-button mt-5">حفظ سعر الصرف</button></form>{params.saved === '1' && <p className="mt-4 text-sm text-emerald-300">تم حفظ سعر الصرف في Supabase بنجاح.</p>}{params.saved === 'showcase' && <p className="mt-4 text-sm text-emerald-300">تم حفظ إعدادات الـHero والهواتف المميزة بنجاح.</p>}{params.error === 'rate' && <p className="mt-4 text-sm text-red-300">القيمة غير صالحة.</p>}{params.error === 'save' && <p className="mt-4 text-sm text-red-300">تعذر حفظ سعر الصرف.</p>}{params.error === 'showcase' && <p className="mt-4 text-sm text-red-300">تعذر حفظ إعدادات الواجهة الرئيسية أو أن أحد المنتجات لم يعد نشطًا.</p>}</section>
    <SiteBrandingSettings />
    <section className="glass mt-5 rounded-3xl p-7"><h2 className="text-xl font-extrabold">الوصول إلى الإدارة</h2><p className="mt-2 text-sm leading-7 text-slate-400">يدخل المسؤولون من صفحة الدخول الخاصة بالإدارة، ولا يحتاج الزبون لأي حساب.</p><div className="mt-4 rounded-xl bg-black/20 p-4 font-mono text-sm text-sky-300">/admin/login</div></section>
  </div></main>;
}

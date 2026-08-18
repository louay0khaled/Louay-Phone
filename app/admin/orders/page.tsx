import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STATUS_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'contacted', label: 'تم التواصل' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
] as const;

type OrderStatus = (typeof STATUS_OPTIONS)[number]['value'];

function statusLabel(value: string) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function normalizeSearch(value: string | undefined) {
  return String(value ?? '').trim().slice(0, 80);
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return amount > 0 ? `${Math.round(amount).toLocaleString('ar-SY')} ل.س` : '—';
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/admin/login');
  const { data: admin } = await supabase.from('admins').select('id').eq('id', userId).eq('is_active', true).maybeSingle();
  if (!admin) redirect('/admin/login?error=unauthorized');
  return supabase;
}

async function updateOrderStatus(formData: FormData) {
  'use server';
  const orderId = String(formData.get('order_id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const allowedStatus = STATUS_OPTIONS.find((item) => item.value === status)?.value;
  if (!orderId || !allowedStatus) redirect('/admin/orders?error=invalid');
  const supabase = await requireAdmin();
  const { error } = await supabase.from('orders').update({ status: allowedStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
  if (error) redirect('/admin/orders?error=save');
  revalidatePath('/admin/orders');
  redirect('/admin/orders?saved=1');
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; saved?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await requireAdmin();
  const q = normalizeSearch(params.q);
  const selectedStatus = STATUS_OPTIONS.some((item) => item.value === params.status) ? params.status! : '';

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id,status,notes,total_amount,first_payment,monthly_amount,months,created_at,updated_at,customers(name,phone,address),products(name,model,brands(name))')
    .order('created_at', { ascending: false });

  if (error) {
    return <section className="p-5 lg:p-10"><div className="mx-auto max-w-6xl lp-surface rounded-3xl p-8"><h1 className="text-2xl font-black">الطلبات</h1><p className="mt-3 text-sm text-red-300">تعذر قراءة الطلبات من قاعدة البيانات.</p></div></section>;
  }

  const rows = (orders ?? []).filter((order: any) => {
    const matchesStatus = selectedStatus ? order.status === selectedStatus : true;
    if (!q) return matchesStatus;
    const haystack = [order.id, order.customers?.name, order.customers?.phone, order.products?.name, order.products?.model, order.notes].filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && haystack.includes(q.toLowerCase());
  });

  const total = orders?.length ?? 0;
  const newCount = (orders ?? []).filter((order: any) => order.status === 'new').length;
  const confirmedCount = (orders ?? []).filter((order: any) => order.status === 'confirmed').length;
  const completedCount = (orders ?? []).filter((order: any) => order.status === 'completed').length;

  return <section className="p-5 lg:p-10">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black tracking-[.18em] text-sky-300">ORDER CONTROL</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">الطلبات</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">إدارة طلبات الزبائن ومتابعة حالتها من مكان واحد، مع الحفاظ على منطق الطلب الحالي وربطه مباشرة ببيانات Supabase.</p>
        </div>
        <Link href="/admin" className="luxury-button-secondary w-fit">← لوحة التحكم</Link>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[['إجمالي الطلبات', total, 'text-white'], ['جديدة', newCount, 'text-sky-300'], ['مؤكدة', confirmedCount, 'text-amber-300'], ['مكتملة', completedCount, 'text-emerald-300']].map(([label, value, tone]) => <div key={String(label)} className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">{label}</p><b className={`mt-1 block text-2xl ${tone}`}>{Number(value).toLocaleString('ar-SY')}</b></div>)}
      </div>

      <form className="lp-surface mt-5 grid gap-3 rounded-3xl p-4 md:grid-cols-[1fr_180px_auto]" method="get">
        <input className="luxury-input" name="q" defaultValue={q} placeholder="ابحث بالاسم أو الهاتف أو المنتج أو رقم الطلب" />
        <select className="luxury-input" name="status" defaultValue={selectedStatus}>
          <option value="">كل الحالات</option>
          {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button className="luxury-button" type="submit">تصفية الطلبات</button>
      </form>

      {(params.saved === '1' || params.error) && <div className={`mt-4 rounded-2xl border p-4 text-sm ${params.error ? 'border-red-400/20 bg-red-500/10 text-red-300' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'}`}>{params.error === 'save' ? 'تعذر حفظ حالة الطلب.' : params.error === 'invalid' ? 'بيانات الطلب غير صالحة.' : 'تم تحديث حالة الطلب بنجاح.'}</div>}

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.02] shadow-2xl shadow-black/20">
        {rows.map((order: any) => <article key={order.id} className="border-b border-white/[.06] p-5 last:border-b-0">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="luxury-badge">{statusLabel(order.status)}</span><span className="text-[11px] text-slate-500">#{order.id.slice(0, 8)}</span><span className="text-[11px] text-slate-600">{new Date(order.created_at).toLocaleString('ar-SY')}</span></div>
              <h2 className="mt-3 text-lg font-black">{order.customers?.name ?? 'زبون غير مسجل'}</h2>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400"><span>{order.customers?.phone ?? 'بدون هاتف'}</span><span>{order.products?.brands?.name ? `${order.products.brands.name} · ` : ''}{order.products?.name ?? 'منتج محذوف'}</span>{order.products?.model ? <span>{order.products.model}</span> : null}</div>
              {order.customers?.address ? <p className="mt-2 text-sm text-slate-500">العنوان: {order.customers.address}</p> : null}
              {order.notes ? <p className="mt-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-3 text-sm leading-7 text-slate-400">ملاحظات: {order.notes}</p> : null}
            </div>
            <div className="w-full shrink-0 xl:max-w-xs">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3"><span className="text-[11px] text-slate-500">الإجمالي</span><b className="mt-1 block">{money(order.total_amount)}</b></div>
                <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3"><span className="text-[11px] text-slate-500">الدفعة الأولى</span><b className="mt-1 block">{money(order.first_payment)}</b></div>
              </div>
              {order.months ? <p className="mt-2 text-xs text-slate-500">تقسيط: {order.months} شهر · القسط {money(order.monthly_amount)}</p> : null}
              <form action={updateOrderStatus} className="mt-3 grid grid-cols-[1fr_auto] gap-2"><input type="hidden" name="order_id" value={order.id}/><select name="status" defaultValue={order.status} className="luxury-input"><option value="new">جديد</option><option value="contacted">تم التواصل</option><option value="confirmed">مؤكد</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select><button className="luxury-button" type="submit">حفظ</button></form>
            </div>
          </div>
        </article>)}
        {!rows.length && <div className="p-14 text-center text-slate-500">لا توجد طلبات مطابقة للبحث الحالي.</div>}
      </div>
    </div>
  </section>;
}

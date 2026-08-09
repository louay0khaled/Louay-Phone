import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const items = [
  ['المنتجات', 'إضافة وتعديل الهواتف والصور والمواصفات والأسعار', '/admin/products'],
  ['التقسيط', 'إدارة خطط التقسيط لكل هاتف', '/admin/installments'],
  ['الطلبات', 'متابعة الطلبات وحالاتها', '/admin/orders'],
  ['المحادثات', 'استقبال والرد على استفسارات Telegram', '/admin/conversations'],
  ['التقييمات', 'مراجعة تقييمات وتعليقات العملاء', '/admin/reviews'],
  ['الإعدادات', 'سعر الصرف وبيانات المتجر وTelegram', '/admin/settings'],
];

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ count: products }, { count: orders }, { count: conversations }, { count: reviews }] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).in('status', ['open', 'processing']),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_approved', false),
  ]);
  const stats = [['المنتجات', products ?? 0], ['طلبات جديدة', orders ?? 0], ['محادثات مفتوحة', conversations ?? 0], ['تقييمات معلّقة', reviews ?? 0]];

  return <main className="min-h-screen bg-[#030712] text-white luxury-grid"><div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div className="mb-10 flex items-center justify-between"><div><p className="text-sm font-bold text-sky-400">LOUAY PHONE</p><h1 className="mt-1 text-3xl font-extrabold">لوحة الإدارة</h1><p className="mt-2 text-sm text-slate-400">تحكم كامل بالمتجر من مكان واحد.</p></div><Link href="/" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">المتجر</Link></div>
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([title, value])=><div key={title} className="glass rounded-3xl p-5"><div className="text-sm text-slate-400">{title}</div><div className="mt-2 text-3xl font-extrabold text-sky-400">{value}</div></div>)}</div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(([title, text, href])=><Link key={href} href={href} className="glass rounded-3xl p-6 transition hover:-translate-y-1 hover:border-sky-400/30"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">✦</div><h2 className="font-extrabold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p><div className="mt-5 text-xs font-bold text-sky-400">فتح القسم ←</div></Link>)}</div>
  </div></main>;
}

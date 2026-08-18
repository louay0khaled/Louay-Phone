import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const sections = [
  ['المنتجات', 'إضافة وتعديل الهواتف والصور والمواصفات والأسعار', '/admin/products'],
  ['صور المنتجات', 'رفع الصور يدويًا واختيار الرئيسية ومراجعة المعرض', '/admin/images'],
  ['التقسيط', 'إدارة خطط التقسيط لكل هاتف', '/admin/installments'],
  ['الطلبات', 'متابعة الطلبات وحالاتها وتحديثها من مكان واحد', '/admin/orders'],
  ['المحادثات', 'مراجعة الاستفسارات والرد على الزبائن', '/admin/messages'],
  ['التقييمات', 'مراجعة تقييمات وتعليقات العملاء قبل نشرها', '/admin/reviews'],
  ['العلامات', 'إدارة العلامات التجارية والظهور في الكتالوج', '/admin/brands'],
  ['الإعدادات', 'سعر الصرف وبيانات المتجر وواجهة الصفحة الرئيسية', '/admin/settings'],
] as const;

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [
    { count: activeProducts },
    { count: totalProducts },
    { count: outOfStock },
    { count: newOrders },
    { count: openConversations },
    { count: pendingReviews },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'out_of_stock'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).in('status', ['open', 'processing']),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_approved', false),
  ]);

  const stats = [
    ['هواتف منشورة', activeProducts ?? 0, 'text-sky-300'],
    ['إجمالي السجل', totalProducts ?? 0, 'text-white'],
    ['طلبات جديدة', newOrders ?? 0, 'text-amber-300'],
    ['محادثات مفتوحة', openConversations ?? 0, 'text-cyan-300'],
    ['تقييمات معلّقة', pendingReviews ?? 0, 'text-violet-300'],
    ['غير متوفرة', outOfStock ?? 0, 'text-red-300'],
  ];

  return <main className="min-h-screen bg-[#030712] text-white luxury-grid"><div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
    <div className="mb-9 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-black tracking-[.18em] text-sky-300">CONTROL CENTER</p><h1 className="mt-2 text-3xl font-black tracking-tight">لوحة الإدارة</h1><p className="mt-2 text-sm leading-7 text-slate-400">نظرة سريعة على المتجر والطلبات والمحادثات والتقييمات، مع وصول مباشر لكل قسم.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/" className="luxury-button-secondary">مشاهدة المتجر</Link><Link href="/admin/products/new" className="luxury-button">+ إضافة هاتف</Link></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{stats.map(([title, value, tone]) => <div key={title} className="lp-surface rounded-2xl p-4"><div className="text-xs text-slate-500">{title}</div><div className={`mt-2 text-2xl font-black ${tone}`}>{Number(value).toLocaleString('ar-SY')}</div></div>)}</div>

    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{sections.map(([title, text, href]) => <Link key={href} href={href} className="lp-surface group rounded-3xl p-6 transition hover:-translate-y-1 hover:border-sky-300/25"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/10 bg-sky-400/[.06] text-sky-300">✦</div><h2 className="font-black">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-400">{text}</p><div className="mt-5 text-xs font-black text-sky-300 transition group-hover:text-white">فتح القسم ←</div></Link>)}</div>

    <section className="lp-surface mt-8 rounded-3xl p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black tracking-[.15em] text-slate-500">OPERATIONS</p><h2 className="mt-2 text-xl font-black">أهم ما يحتاج انتباه الآن</h2></div><Link href="/admin/orders" className="text-xs font-black text-sky-300">مراجعة الطلبات ←</Link></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Link href="/admin/orders" className="rounded-2xl border border-amber-300/10 bg-amber-400/[.04] p-4"><span className="text-xs text-slate-500">طلبات جديدة</span><b className="mt-1 block text-2xl text-amber-300">{newOrders ?? 0}</b><p className="mt-2 text-xs text-slate-500">الطلبات التي لم تتم معالجتها بعد.</p></Link><Link href="/admin/messages" className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[.04] p-4"><span className="text-xs text-slate-500">محادثات مفتوحة</span><b className="mt-1 block text-2xl text-cyan-300">{openConversations ?? 0}</b><p className="mt-2 text-xs text-slate-500">محادثات تحتاج متابعة أو ردًا.</p></Link><Link href="/admin/reviews" className="rounded-2xl border border-violet-300/10 bg-violet-400/[.04] p-4"><span className="text-xs text-slate-500">تقييمات معلّقة</span><b className="mt-1 block text-2xl text-violet-300">{pendingReviews ?? 0}</b><p className="mt-2 text-xs text-slate-500">تحتاج مراجعة قبل الظهور للزبائن.</p></Link></div></section>
  </div></main>;
}

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Smartphone, CreditCard, ShoppingBag, MessageCircle, Star, Settings, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const links = [
  ['لوحة التحكم', '/admin', LayoutDashboard], ['واجهة المتجر', '/admin/settings', Home], ['المنتجات', '/admin/products', Smartphone],
  ['التقسيط', '/admin/installments', CreditCard], ['الطلبات', '/admin/orders', ShoppingBag],
  ['المحادثات', '/admin/messages', MessageCircle], ['التقييمات', '/admin/reviews', Star], ['الإعدادات', '/admin/settings', Settings],
] as const;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get('x-louay-pathname');
  if (pathname === '/admin/login') return children;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/admin/login');
  const { data: admin } = await supabase.from('admins').select('id,name,role,is_active').eq('id', userId).eq('is_active', true).maybeSingle();
  if (!admin) { await supabase.auth.signOut(); redirect('/admin/login?error=unauthorized'); }
  return <div dir="rtl" className="min-h-screen bg-[#07090c] text-white">
    <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 border-l border-white/[.08] bg-[#090c10]/95 p-5 backdrop-blur-xl lg:block">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-200 to-sky-500 font-black text-slate-950 shadow-lg shadow-sky-500/10">LP</div><div><b>Louay Phone</b><p className="text-xs text-slate-500">Control Center</p></div></div>
      <nav className="space-y-1.5">{links.map(([label, href, Icon], index) => <Link key={`${href}-${label}`} href={href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 ${index === 1 ? 'border border-sky-300/10 bg-sky-400/[.06] text-sky-200' : 'text-slate-300 hover:bg-white/[.04] hover:text-white'}`}><Icon size={18}/>{label}</Link>)}</nav>
      <div className="mt-8 rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><p className="text-xs text-slate-500">المسؤول الحالي</p><p className="mt-1 font-bold">{admin.name}</p><p className="mt-1 text-xs text-sky-300">{admin.role}</p></div>
    </aside>
    <div className="sticky top-0 z-30 border-b border-white/[.08] bg-[#090c10]/90 px-4 py-3 backdrop-blur-xl lg:hidden"><div className="flex items-center justify-between gap-3"><Link href="/admin" className="font-black">Louay <span className="text-sky-300">Phone</span></Link><Link href="/admin/settings" className="rounded-xl border border-sky-300/15 bg-sky-400/[.06] px-3 py-2 text-xs font-black text-sky-200">واجهة المتجر</Link></div></div>
    <main className="min-h-screen lg:mr-72">{children}</main>
  </div>;
}

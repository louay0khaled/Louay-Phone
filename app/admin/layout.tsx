import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Smartphone, CreditCard, ShoppingBag, MessageCircle, Star, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const links = [
  ['لوحة التحكم', '/admin', LayoutDashboard], ['المنتجات', '/admin/products', Smartphone],
  ['التقسيط', '/admin/installments', CreditCard], ['الطلبات', '/admin/orders', ShoppingBag],
  ['المحادثات', '/admin/messages', MessageCircle], ['التقييمات', '/admin/reviews', Star], ['الإعدادات', '/admin/settings', Settings],
] as const;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/admin/login');
  const { data: admin } = await supabase.from('admins').select('id,name,role,is_active').eq('id', userId).eq('is_active', true).maybeSingle();
  if (!admin) { await supabase.auth.signOut(); redirect('/admin/login?error=unauthorized'); }

  return <div dir="rtl" className="min-h-screen bg-slate-950 text-white">
    <aside className="fixed inset-y-0 right-0 hidden w-72 border-l border-white/10 bg-slate-950/95 p-5 lg:block">
      <div className="mb-8 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400 font-black text-slate-950">LP</div><div><b>Louay Phone</b><p className="text-xs text-slate-500">لوحة الإدارة</p></div></div>
      <nav className="space-y-2">{links.map(([label, href, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-sky-400/10 hover:text-sky-300"><Icon size={18}/>{label}</Link>)}</nav>
      <div className="mt-8 rounded-2xl border border-sky-400/10 bg-sky-400/5 p-4"><p className="text-xs text-slate-500">المسؤول الحالي</p><p className="mt-1 font-bold">{admin.name}</p><p className="mt-1 text-xs text-sky-300">{admin.role}</p></div>
    </aside>
    <main className="min-h-screen lg:mr-72">{children}</main>
  </div>;
}

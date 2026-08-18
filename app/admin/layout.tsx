import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Smartphone, CreditCard, ShoppingBag, MessageCircle, Star, Settings, Home, Images, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const links = [
  ['لوحة التحكم', '/admin', LayoutDashboard],
  ['واجهة المتجر', '/admin/settings', Home],
  ['المنتجات', '/admin/products', Smartphone],
  ['صور المنتجات', '/admin/images', Images],
  ['التقسيط', '/admin/installments', CreditCard],
  ['الطلبات', '/admin/orders', ShoppingBag],
  ['المحادثات', '/admin/messages', MessageCircle],
  ['التقييمات', '/admin/reviews', Star],
  ['الإعدادات', '/admin/settings', Settings],
] as const;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get('x-louay-pathname') || '/admin';
  if (pathname === '/admin/login') return children;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/admin/login');
  const { data: admin } = await supabase.from('admins').select('id,name,role,is_active').eq('id', userId).eq('is_active', true).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    redirect('/admin/login?error=unauthorized');
  }

  const activeHref = links.find(([, href]) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))?.[1];

  return (
    <div dir="rtl" className="admin-shell min-h-screen text-white">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[288px] border-l border-white/[.08] bg-[#090c10]/95 p-5 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-white to-sky-300 font-black text-slate-950 shadow-lg shadow-sky-500/10">LP</div>
          <div><b>Louay Phone</b><p className="mt-0.5 text-xs text-slate-500">Operations Center</p></div>
        </div>

        <nav className="space-y-1.5" aria-label="إدارة المتجر">
          {links.map(([label, href, Icon]) => {
            const active = activeHref === href;
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${active ? 'border-sky-300/15 bg-sky-300/[.07] text-sky-100 shadow-[inset_3px_0_0_rgba(120,216,255,.65)]' : 'border-transparent text-slate-300 hover:bg-white/[.035] hover:text-white'}`}>
                <Icon size={18} strokeWidth={2.1}/><span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <Link href="/" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/[.08] bg-white/[.025] px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-sky-300/15 hover:bg-sky-300/[.04] hover:text-white">
            <span>فتح المتجر</span><ExternalLink size={16}/>
          </Link>
          <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
            <p className="text-xs text-slate-500">المسؤول الحالي</p>
            <p className="mt-1 font-bold">{admin.name}</p>
            <p className="mt-1 text-xs text-sky-300">{admin.role}</p>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-30 border-b border-white/[.08] bg-[#090c10]/92 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="font-black">Louay <span className="text-sky-300">Phone</span></Link>
          <Link href="/admin/settings" className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-black text-slate-200">الواجهة</Link>
        </div>
      </div>

      <main className="min-h-screen lg:mr-[288px]">{children}</main>
    </div>
  );
}

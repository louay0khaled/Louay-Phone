import Link from 'next/link';

const demoProducts = [
  { name: 'هاتفك القادم', brand: 'Louay Collection', price: '—', status: 'ستتوفر المنتجات قريبًا' },
  { name: 'أحدث الهواتف', brand: 'Premium', price: '—', status: 'تتم إضافة المنتجات من لوحة الإدارة' },
  { name: 'مجموعة مميزة', brand: 'Louay Phone', price: '—', status: 'قاعدة المنتجات متصلة بـ Supabase' },
];

export default function ProductsPage() {
  return <main dir="rtl" className="min-h-screen bg-[#030712] text-white luxury-grid"><header className="border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5"><Link href="/" className="font-extrabold">Louay <span className="text-sky-400">Phone</span></Link><Link href="/" className="text-sm text-slate-400 hover:text-white">الرئيسية</Link></div></header><section className="mx-auto max-w-7xl px-5 py-14"><div className="mb-10"><p className="text-sm font-bold text-sky-400">COLLECTION</p><h1 className="mt-2 text-4xl font-extrabold">الهواتف</h1><p className="mt-3 text-slate-400">استعرض الهواتف المتاحة مع الأسعار والمواصفات وخيارات التقسيط.</p></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{demoProducts.map((p) => <article key={p.name} className="glass overflow-hidden rounded-3xl"><div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800"><div className="h-36 w-20 rounded-[1.4rem] border-4 border-slate-600 bg-slate-950 shadow-2xl shadow-sky-500/10" /></div><div className="p-6"><p className="text-xs font-bold text-sky-400">{p.brand}</p><h2 className="mt-2 text-xl font-extrabold">{p.name}</h2><p className="mt-2 text-sm text-slate-400">{p.status}</p><div className="mt-5 flex items-center justify-between"><span className="font-bold text-slate-300">{p.price}</span><button disabled className="rounded-xl bg-sky-400/20 px-4 py-2 text-sm font-bold text-sky-300">اطلب الآن</button></div></div></article>)}</div></section></main>;
}

import Image from 'next/image';
import Link from 'next/link';
import { getSiteAssets } from '@/lib/site-config';

export default async function StoreHeader({ compact = false }: { compact?: boolean }) {
  const assets = await getSiteAssets();
  return <header className="sticky top-0 z-40 border-b border-sky-300/10 bg-slate-950/75 backdrop-blur-2xl">
    <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 ${compact ? 'py-3' : 'py-4'} sm:px-6 lg:px-8`}>
      <Link href="/" className="flex min-w-0 items-center gap-3">
        {assets.logo?.url ? <Image src={assets.logo.url} alt="Louay Phone" width={180} height={40} sizes="(max-width: 640px) 140px, 180px" className={`${compact ? 'h-8' : 'h-10'} w-auto max-w-[180px] object-contain`} priority={!compact} /> : <div><div className="text-xl font-black tracking-tight text-white">Louay <span className="text-sky-400">Phone</span></div><div className="hidden text-[9px] font-bold tracking-[.22em] text-slate-500 sm:block">PREMIUM SMARTPHONES</div></div>}
      </Link>
      <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-400 md:flex">
        <Link href="/products" className="transition hover:text-sky-300">الهواتف</Link>
        <button type="button" data-open-chat className="transition hover:text-sky-300">تواصل معنا</button>
      </nav>
      <Link href="/products" className="luxury-button !min-h-10 !rounded-xl !px-4 !py-2 text-sm">تصفح الهواتف</Link>
    </div>
  </header>;
}

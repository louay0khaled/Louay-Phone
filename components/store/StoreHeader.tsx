import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Search } from 'lucide-react';
import { getSiteAssets } from '@/lib/site-config';
import MobileAppBar from './MobileAppBar';

export default async function StoreHeader({ compact = false }: { compact?: boolean }) {
  const assets = await getSiteAssets();
  return (
    <>
      <header className={`store-nav ${compact ? 'store-nav--compact' : ''}`}>
        <div className="store-nav__inner">
          <Link href="/" className="store-nav__brand" aria-label="Louay Phone">
            {assets.logo?.url ? (
              <Image src={assets.logo.url} alt="Louay Phone" width={180} height={40} sizes="(max-width: 640px) 140px, 180px" className="store-nav__logo" priority={!compact} />
            ) : (
              <span className="store-nav__wordmark">Louay <b>Phone</b></span>
            )}
          </Link>
          <nav className="store-nav__links" aria-label="التنقل الرئيسي">
            <Link href="/products">الهواتف</Link>
            <Link href="/products#brands">الماركات</Link>
            <Link href="/#featured">المختارات</Link>
            <button type="button" data-open-chat>المساعدة</button>
          </nav>
          <div className="store-nav__actions">
            <Link href="/products" className="store-nav__icon" aria-label="البحث عن هاتف"><Search size={18} strokeWidth={2} /></Link>
            <Link href="/products" className="store-nav__cta">تسوّق الآن</Link>
          </div>
        </div>
      </header>
      <div className="store-support-pill" aria-hidden="true"><MessageCircle size={14}/> دعم مباشر</div>
      <MobileAppBar />
    </>
  );
}

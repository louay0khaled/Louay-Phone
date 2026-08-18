import Image from 'next/image';
import Link from 'next/link';
import { getSiteAssets } from '@/lib/site-config';
import MobileAppBar from './MobileAppBar';

export default async function StoreHeader({ compact = false }: { compact?: boolean }) {
  const assets = await getSiteAssets();
  return (
    <>
      <link rel="stylesheet" href="/premium-storefront.css?v=2" />
      <header className="store-nav">
        <div className={`store-nav__inner ${compact ? 'store-nav__inner--compact' : ''}`}>
          <Link href="/" className="store-nav__brand" aria-label="Louay Phone">
            {assets.logo?.url ? (
              <Image src={assets.logo.url} alt="Louay Phone" width={180} height={40} sizes="(max-width: 640px) 140px, 180px" className="store-nav__logo" priority={!compact} />
            ) : (
              <span className="store-nav__wordmark">Louay <b>Phone</b></span>
            )}
          </Link>
          <nav className="store-nav__links" aria-label="التنقل الرئيسي">
            <Link href="/products">الهواتف</Link>
            <Link href="/products#brands">العلامات</Link>
            <button type="button" data-open-chat>المساعدة</button>
          </nav>
          <Link href="/products" className="store-nav__cta">تسوّق الآن</Link>
        </div>
      </header>
      <MobileAppBar />
    </>
  );
}

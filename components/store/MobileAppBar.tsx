'use client';

import Link from 'next/link';
import { Home, MessageCircle, Smartphone } from 'lucide-react';

export default function MobileAppBar() {
  return (
    <nav className="mobile-app-bar" aria-label="تنقل المتجر على الهاتف">
      <Link href="/" className="mobile-app-bar__item" aria-label="الرئيسية">
        <Home size={19} strokeWidth={2.2} />
        <span>الرئيسية</span>
      </Link>
      <Link href="/products" className="mobile-app-bar__item mobile-app-bar__item--primary" aria-label="الهواتف">
        <Smartphone size={20} strokeWidth={2.2} />
        <span>الهواتف</span>
      </Link>
      <button type="button" className="mobile-app-bar__item" data-open-chat aria-label="المساعدة">
        <MessageCircle size={19} strokeWidth={2.2} />
        <span>المساعدة</span>
      </button>
    </nav>
  );
}

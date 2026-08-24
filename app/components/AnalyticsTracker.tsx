'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const payload = JSON.stringify({
      eventName: 'page_view',
      path: window.location.pathname,
      referrer: document.referrer || null,
      metadata: { viewport: `${window.innerWidth}x${window.innerHeight}` },
    });
    const body = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon?.('/api/analytics', body) || void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
  }, [pathname]);

  return null;
}

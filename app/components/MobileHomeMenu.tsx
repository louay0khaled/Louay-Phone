'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const links = [
  ['الهواتف', '#lineup'],
  ['التجربة', '#experience'],
  ['الماركات', '#brands'],
  ['Louay Phone', '#about'],
] as const;

export default function MobileHomeMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="mobile-home-menu">
      <button
        className="nav-menu"
        type="button"
        aria-expanded={open}
        aria-controls="home-mobile-menu"
        aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'إغلاق' : 'القائمة'}
      </button>

      {open && (
        <div id="home-mobile-menu" className="mobile-menu-panel" role="dialog" aria-modal="true">
          <button className="mobile-menu-scrim" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} />
          <div className="mobile-menu-card">
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                <span>{label}</span>
                <span aria-hidden="true">›</span>
              </Link>
            ))}
            <Link className="mobile-menu-cta" href="#lineup" onClick={() => setOpen(false)}>
              تسوّق الآن
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

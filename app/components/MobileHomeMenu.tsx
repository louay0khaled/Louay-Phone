'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './MobileHomeMenu.module.css';

const links = [
  ['الهواتف المميزة', '#lineup'],
  ['الماركات', '#brands'],
  ['الكتالوج الكامل', '/products'],
  ['الدعم والمحادثة', '/chat'],
] as const;

export default function MobileHomeMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <div className={styles.root}>
      <button
        className={styles.trigger}
        type="button"
        aria-expanded={open}
        aria-controls="home-mobile-menu"
        aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'إغلاق' : 'القائمة'}
      </button>

      {open && (
        <div id="home-mobile-menu" className={styles.panel} role="dialog" aria-modal="true" aria-label="قائمة المتجر">
          <button className={styles.scrim} type="button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} />
          <div className={styles.card}>
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                <span>{label}</span>
                <span aria-hidden="true">›</span>
              </Link>
            ))}
            <Link className={styles.cta} href="/products" onClick={() => setOpen(false)}>
              تسوّق الآن
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

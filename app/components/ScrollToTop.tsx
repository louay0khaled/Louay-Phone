'use client';

import { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return <button type="button" className="scroll-top" aria-label="العودة إلى الأعلى" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>;
}

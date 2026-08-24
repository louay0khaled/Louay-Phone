'use client';

import Image from 'next/image';
import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent, type TouchEvent } from 'react';
import type { ProductImage } from '@/lib/products';

const SUPABASE_ORIGIN = 'https://gmpogiiqydoxoclxcvwh.supabase.co';

function isOptimizable(url: string) {
  try { return new URL(url).origin === SUPABASE_ORIGIN; } catch { return false; }
}

function ProductImageView({ src, alt, priority = false, large = false }: { src: string; alt: string; priority?: boolean; large?: boolean }) {
  if (isOptimizable(src)) {
    return <Image src={src} alt={alt} width={large ? 1600 : 1000} height={large ? 1600 : 1000} sizes={large ? '(max-width: 900px) 100vw, 90vw' : '(max-width: 900px) 100vw, 58vw'} priority={priority} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: large ? 24 : 48 }} />;
  }
  return <img src={src} alt={alt} fetchPriority={priority ? 'high' : 'auto'} loading={priority ? 'eager' : 'lazy'} />;
}

export default function ProductGallery({ name, images }: { name: string; images: ProductImage[] }) {
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const current = images[active] ?? images[0];

  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setZoomOpen(false);
      if (event.key === 'ArrowLeft') setActive((index) => Math.min(images.length - 1, index + 1));
      if (event.key === 'ArrowRight') setActive((index) => Math.max(0, index - 1));
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [zoomOpen, images.length]);

  if (!current) {
    return <div className="product-gallery"><div className="product-gallery__stage"><div className="product-card__placeholder">الصورة قيد الإضافة</div></div></div>;
  }

  const move = (direction: -1 | 1) => setActive((index) => Math.max(0, Math.min(images.length - 1, index + direction)));
  const onStageKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(-1); }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setZoomOpen(true); }
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => setTouchStart(event.changedTouches[0]?.clientX ?? null);
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStart == null) return;
    const end = event.changedTouches[0]?.clientX ?? touchStart;
    const delta = end - touchStart;
    if (Math.abs(delta) > 48) move(delta > 0 ? -1 : 1);
    setTouchStart(null);
  };

  return (
    <div className="product-gallery">
      <div className="product-gallery__stage product-gallery__stage--interactive" role="button" tabIndex={0} aria-label="فتح صورة المنتج بحجم كبير" onClick={() => setZoomOpen(true)} onKeyDown={onStageKey} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <ProductImageView src={current.url} alt={current.alt_text ?? name} priority />
        {images.length > 1 && <div className="product-gallery__count">{active + 1} / {images.length}</div>}
        {images.length > 1 && <><button type="button" className="product-gallery__nav product-gallery__nav--prev" aria-label="الصورة السابقة" onClick={(event) => { event.stopPropagation(); move(-1); }} disabled={active === 0}>‹</button><button type="button" className="product-gallery__nav product-gallery__nav--next" aria-label="الصورة التالية" onClick={(event) => { event.stopPropagation(); move(1); }} disabled={active === images.length - 1}>›</button></>}
      </div>
      {images.length > 1 && <div className="product-gallery__thumbs" role="list" aria-label="صور المنتج">
        {images.map((image, index) => <button type="button" key={image.id ?? `${image.url}-${index}`} className={index === active ? 'product-gallery__thumb product-gallery__thumb--active' : 'product-gallery__thumb'} onClick={() => setActive(index)} aria-label={`الصورة ${index + 1}`} aria-pressed={index === active}>
          <ProductImageView src={image.url} alt="" />
        </button>)}
      </div>}

      {zoomOpen && <div className="product-gallery__lightbox" role="dialog" aria-modal="true" aria-label={`صورة ${name}`} onClick={() => setZoomOpen(false)}>
        <button type="button" className="product-gallery__close" aria-label="إغلاق" onClick={() => setZoomOpen(false)}>×</button>
        <div className="product-gallery__lightbox-stage" onClick={(event) => event.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <ProductImageView src={current.url} alt={current.alt_text ?? name} large priority />
          {images.length > 1 && <div className="product-gallery__count">{active + 1} / {images.length}</div>}
        </div>
      </div>}
    </div>
  );
}

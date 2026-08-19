'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type GalleryImage = { url: string; alt?: string | null };

export default function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const safeImages = images.filter((image) => image?.url);
  const [active, setActive] = useState(0);
  const current = safeImages[active] ?? safeImages[0];

  useEffect(() => {
    if (safeImages.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setActive((value) => (value + 1) % safeImages.length);
      if (event.key === 'ArrowRight') setActive((value) => (value - 1 + safeImages.length) % safeImages.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [safeImages.length]);

  if (!current) {
    return <div className="premium-product-gallery premium-product-gallery--empty" aria-label={`لا توجد صور لـ ${name}`}>لا توجد صور متاحة حاليًا</div>;
  }

  return (
    <div className="premium-product-gallery">
      <div className="premium-product-gallery__stage" aria-live="polite">
        <Image src={current.url} alt={current.alt || name} fill sizes="(max-width: 900px) 100vw, 56vw" className="premium-product-gallery__image" priority={active === 0} />
      </div>
      {safeImages.length > 1 && (
        <div className="premium-product-gallery__thumbs" role="list" aria-label="صور المنتج">
          {safeImages.map((image, index) => (
            <button key={`${image.url}-${index}`} type="button" className={`premium-product-gallery__thumb ${index === active ? 'is-active' : ''}`} onClick={() => setActive(index)} aria-label={`عرض الصورة ${index + 1}`} aria-current={index === active ? 'true' : undefined}>
              <Image src={image.url} alt="" fill sizes="78px" className="premium-product-gallery__thumb-image" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

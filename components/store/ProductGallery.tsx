'use client';

import Image from 'next/image';
import { useState } from 'react';

type GalleryImage = { url: string; alt?: string | null };

export default function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const safeImages = images.filter((image) => image?.url);
  const [active, setActive] = useState(0);
  const current = safeImages[active] ?? safeImages[0];

  if (!current) {
    return <div className="premium-product-gallery premium-product-gallery--empty" aria-label={`لا توجد صور لـ ${name}`}><link rel="stylesheet" href="/product-gallery.css?v=1" />لا توجد صور متاحة</div>;
  }

  return (
    <>
      <link rel="stylesheet" href="/product-gallery.css?v=1" />
      <div className="premium-product-gallery">
        <div className="premium-product-gallery__stage">
          <Image src={current.url} alt={current.alt || name} fill sizes="(max-width: 900px) 100vw, 56vw" className="premium-product-gallery__image" priority={active === 0} />
        </div>
        {safeImages.length > 1 && (
          <div className="premium-product-gallery__thumbs" role="list" aria-label="صور المنتج">
            {safeImages.map((image, index) => (
              <button key={`${image.url}-${index}`} type="button" className={`premium-product-gallery__thumb ${index === active ? 'is-active' : ''}`} onClick={() => setActive(index)} aria-label={`عرض الصورة ${index + 1}`} aria-pressed={index === active}>
                <Image src={image.url} alt="" fill sizes="72px" className="premium-product-gallery__thumb-image" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

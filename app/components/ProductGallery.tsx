'use client';

import { useState } from 'react';
import type { ProductImage } from '@/lib/products';

export default function ProductGallery({ name, images }: { name: string; images: ProductImage[] }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (!current) {
    return <div className="product-gallery"><div className="product-gallery__stage"><div className="product-card__placeholder">الصورة قيد الإضافة</div></div></div>;
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery__stage">
        <img src={current.url} alt={current.alt_text ?? name} fetchPriority="high" />
        {images.length > 1 && <div className="product-gallery__count">{active + 1} / {images.length}</div>}
      </div>
      {images.length > 1 && <div className="product-gallery__thumbs" role="list" aria-label="صور المنتج">{images.map((image, index) => <button type="button" key={image.id ?? `${image.url}-${index}`} className={index === active ? 'product-gallery__thumb product-gallery__thumb--active' : 'product-gallery__thumb'} onClick={() => setActive(index)} aria-label={`الصورة ${index + 1}`} aria-pressed={index === active}><img src={image.url} alt="" loading={index === 0 ? 'eager' : 'lazy'} /></button>)}</div>}
    </div>
  );
}

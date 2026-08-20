'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { ProductImage } from '@/lib/products';

const SUPABASE_ORIGIN = 'https://gmpogiiqydoxoclxcvwh.supabase.co';

function isOptimizable(url: string) {
  try { return new URL(url).origin === SUPABASE_ORIGIN; } catch { return false; }
}

function ProductImageView({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  if (isOptimizable(src)) {
    return <Image src={src} alt={alt} width={1000} height={1000} sizes="(max-width: 900px) 100vw, 58vw" priority={priority} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 48 }} />;
  }
  return <img src={src} alt={alt} fetchPriority={priority ? 'high' : 'auto'} loading={priority ? 'eager' : 'lazy'} />;
}

export default function ProductGallery({ name, images }: { name: string; images: ProductImage[] }) {
  const [active, setActive] = useState(0);
  const current = useMemo(() => images[active] ?? images[0], [active, images]);

  if (!current) {
    return <div className="product-gallery"><div className="product-gallery__stage"><div className="product-card__placeholder">الصورة قيد الإضافة</div></div></div>;
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery__stage">
        <ProductImageView src={current.url} alt={current.alt_text ?? name} priority />
        {images.length > 1 && <div className="product-gallery__count">{active + 1} / {images.length}</div>}
      </div>
      {images.length > 1 && <div className="product-gallery__thumbs" role="list" aria-label="صور المنتج">
        {images.map((image, index) => <button type="button" key={image.id ?? `${image.url}-${index}`} className={index === active ? 'product-gallery__thumb product-gallery__thumb--active' : 'product-gallery__thumb'} onClick={() => setActive(index)} aria-label={`الصورة ${index + 1}`} aria-pressed={index === active}>
          <ProductImageView src={image.url} alt="" />
        </button>)}
      </div>}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type ImageRow = { id: string; url: string; alt_text: string | null; is_primary: boolean; position: number };

export default function AdminProductMedia({ params }: { params: Promise<{ productId: string }> }) {
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [images, setImages] = useState<ImageRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { params.then(({ productId: id }) => { setProductId(id); load(id); }); }, []);

  async function load(id: string) {
    const { data: product } = await supabaseBrowser.from('products').select('name').eq('id', id).maybeSingle();
    const { data: rows, error: imageError } = await supabaseBrowser.from('product_images').select('id,url,alt_text,is_primary,position').eq('product_id', id).order('position', { ascending: true });
    if (imageError) setError(imageError.message); else setImages((rows ?? []) as ImageRow[]);
    if (product) setProductName(product.name);
  }

  async function upload(file: File) {
    if (!productId || !file.type.startsWith('image/')) return;
    setBusy(true); setError('');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;
    const { error: storageError } = await supabaseBrowser.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
    if (storageError) { setError(storageError.message); setBusy(false); return; }
    const { data: publicData } = supabaseBrowser.storage.from('product-images').getPublicUrl(path);
    const nextPosition = images.length ? Math.max(...images.map((x) => x.position)) + 1 : 0;
    const { data: row, error: insertError } = await supabaseBrowser.from('product_images').insert({ product_id: productId, url: publicData.publicUrl, position: nextPosition, is_primary: images.length === 0, alt_text: productName }).select('id,url,alt_text,is_primary,position').single();
    if (insertError || !row) { await supabaseBrowser.storage.from('product-images').remove([path]); setError(insertError?.message ?? 'تعذر حفظ الصورة.'); } else setImages((current) => [...current, row as ImageRow]);
    setBusy(false);
  }

  async function setPrimary(image: ImageRow) {
    setBusy(true); setError('');
    const { error: clearError } = await supabaseBrowser.from('product_images').update({ is_primary: false }).eq('product_id', productId);
    if (!clearError) { const { error: setErrorResult } = await supabaseBrowser.from('product_images').update({ is_primary: true }).eq('id', image.id); if (setErrorResult) setError(setErrorResult.message); }
    if (!clearError) setImages((current) => current.map((x) => ({ ...x, is_primary: x.id === image.id })));
    else setError(clearError.message);
    setBusy(false);
  }

  async function removeImage(image: ImageRow) {
    setBusy(true); setError('');
    const marker = image.url.match(/product-images\/([^?]+)/)?.[1];
    if (marker) await supabaseBrowser.storage.from('product-images').remove([marker]);
    const { error: deleteError } = await supabaseBrowser.from('product_images').delete().eq('id', image.id);
    if (deleteError) setError(deleteError.message); else setImages((current) => current.filter((x) => x.id !== image.id));
    setBusy(false);
  }

  const sorted = useMemo(() => [...images].sort((a, b) => a.position - b.position), [images]);

  return <main className="section section--gray"><div className="container"><div className="product-detail__crumb"><Link href="/admin">الإدارة</Link><span>›</span><strong>صور {productName}</strong></div><header className="section__head"><div className="eyebrow">PRODUCT MEDIA</div><h1 className="section__title">صور المنتج.</h1><p className="section__lead">ارفع الصور يدويًا، اختر الصورة الرئيسية، واحذف الصور التي لم تعد مناسبة.</p></header><div className="admin-media-toolbar"><label className="btn btn--dark">{busy ? 'جارٍ الحفظ…' : 'رفع صور'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={(e) => { for (const file of Array.from(e.target.files ?? [])) void upload(file); e.currentTarget.value = ''; }} /></label><Link href="/admin" className="btn btn--link">العودة للإدارة</Link></div>{error && <div className="admin-error" role="alert">{error}</div>}<div className="admin-media-grid">{sorted.map((image) => <article className="admin-media-card" key={image.id}><img src={image.url} alt={image.alt_text ?? productName} /><div className="admin-media-actions">{image.is_primary ? <span className="admin-media-primary">رئيسية</span> : <button onClick={() => void setPrimary(image)} disabled={busy} type="button">تعيين رئيسية</button>}<button onClick={() => void removeImage(image)} disabled={busy} type="button">حذف</button></div></article>)}</div>{!sorted.length && <div className="empty-state"><h2>لا توجد صور.</h2><p>ابدأ برفع صور الهاتف من جهازك.</p></div>}</div></main>;
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type ImageRow = { id: string; url: string; alt_text: string | null; is_primary: boolean; position: number };

export default function AdminProductMedia({ params }: { params: Promise<{ productId: string }> }) {
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [images, setImages] = useState<ImageRow[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { let active = true; params.then(({ productId: id }) => { if (active) { setProductId(id); void load(id); } }); return () => { active = false; }; }, [params]);

  async function load(id: string) {
    const [{ data: product }, { data: rows, error: imageError }] = await Promise.all([
      supabaseBrowser.from('products').select('name').eq('id', id).maybeSingle(),
      supabaseBrowser.from('product_images').select('id,url,alt_text,is_primary,position').eq('product_id', id).order('position', { ascending: true }),
    ]);
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
    await saveImageUrl(publicData.publicUrl, productName);
    setBusy(false);
  }

  async function saveImageUrl(imageUrl: string, altText = productName) {
    const clean = imageUrl.trim();
    if (!/^https:\/\//i.test(clean)) { setError('رابط الصورة يجب أن يبدأ بـ https://'); return; }
    setBusy(true); setError('');
    const nextPosition = images.length ? Math.max(...images.map((x) => x.position)) + 1 : 0;
    const { data: row, error: insertError } = await supabaseBrowser.from('product_images').insert({ product_id: productId, url: clean, position: nextPosition, is_primary: images.length === 0, alt_text: altText || productName }).select('id,url,alt_text,is_primary,position').single();
    if (insertError || !row) setError(insertError?.message ?? 'تعذر حفظ رابط الصورة.');
    else { setImages((current) => [...current, row as ImageRow]); setUrl(''); }
    setBusy(false);
  }

  async function setPrimary(image: ImageRow) {
    setBusy(true); setError('');
    const { error: clearError } = await supabaseBrowser.from('product_images').update({ is_primary: false }).eq('product_id', productId);
    if (clearError) { setError(clearError.message); setBusy(false); return; }
    const { error: setErrorResult } = await supabaseBrowser.from('product_images').update({ is_primary: true }).eq('id', image.id);
    if (setErrorResult) setError(setErrorResult.message);
    else setImages((current) => current.map((x) => ({ ...x, is_primary: x.id === image.id })));
    setBusy(false);
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const current = [...sorted];
    const a = current[index]; const b = current[target];
    setBusy(true); setError('');
    const [first, second] = await Promise.all([
      supabaseBrowser.from('product_images').update({ position: b.position }).eq('id', a.id),
      supabaseBrowser.from('product_images').update({ position: a.position }).eq('id', b.id),
    ]);
    const updateError = first.error ?? second.error;
    if (updateError) setError(updateError.message); else {
      const next = current.map((x) => x.id === a.id ? { ...x, position: b.position } : x.id === b.id ? { ...x, position: a.position } : x).sort((x, y) => x.position - y.position);
      setImages(next);
    }
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

  return <main className="section section--gray"><div className="container"><div className="product-detail__crumb"><Link href="/admin">الإدارة</Link><span>›</span><strong>صور {productName}</strong></div><header className="section__head"><div className="eyebrow">PRODUCT MEDIA</div><h1 className="section__title">صور المنتج.</h1><p className="section__lead">ارفع صورة من جهازك أو ألصق رابط صورة مباشر، ثم رتّب المعرض وحدد الصورة الرئيسية.</p></header>
    <div className="admin-media-toolbar"><label className="btn btn--dark">{busy ? 'جارٍ الحفظ…' : 'رفع صور من الجهاز'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={(e) => { for (const file of Array.from(e.target.files ?? [])) void upload(file); e.currentTarget.value = ''; }} /></label><Link href="/admin" className="btn btn--link">العودة للإدارة</Link></div>
    <div className="admin-url-box"><div><strong>إضافة رابط صورة</strong><span>رابط HTTPS مباشر فقط، ويُحفظ كرابط بدون استهلاك Storage.</span></div><div className="admin-url-row"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/phone.webp" inputMode="url" /><button className="btn btn--dark" disabled={busy || !url.trim()} type="button" onClick={() => void saveImageUrl(url)}>إضافة الرابط</button></div></div>
    {error && <div className="admin-error" role="alert">{error}</div>}
    <div className="admin-media-grid">{sorted.map((image, index) => <article className="admin-media-card" key={image.id}><img src={image.url} alt={image.alt_text ?? productName} loading="lazy" /><div className="admin-media-actions"><button onClick={() => void moveImage(index, -1)} disabled={busy || index === 0} type="button" aria-label="تحريك لأعلى">↑</button><button onClick={() => void moveImage(index, 1)} disabled={busy || index === sorted.length - 1} type="button" aria-label="تحريك لأسفل">↓</button>{image.is_primary ? <span className="admin-media-primary">رئيسية</span> : <button onClick={() => void setPrimary(image)} disabled={busy} type="button">تعيين رئيسية</button>}<button onClick={() => void removeImage(image)} disabled={busy} type="button">حذف</button></div><small className="admin-media-source">{image.url.includes('gmpogiiqydoxoclxcvwh.supabase.co/storage') ? 'مخزنة في المتجر' : 'رابط خارجي'}</small></article>)}</div>
    {!sorted.length && <div className="empty-state"><h2>لا توجد صور.</h2><p>ابدأ برفع صورة من جهازك أو ألصق رابط صورة.</p></div>}</div></main>;
}

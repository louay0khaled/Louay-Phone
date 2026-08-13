'use client';

import { useState } from 'react';

type Brand = { id: string; name: string; slug: string; imageUrl?: string | null };

function compressImage(file: File) {
  return new Promise<File>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const max = 1200;
      const scale = Math.min(1, max / image.naturalWidth, max / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('تعذر تجهيز الصورة.'));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('تعذر ضغط الصورة.'));
        const ext = type === 'image/png' ? 'png' : 'jpg';
        resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${ext}`, { type }));
      }, type, type === 'image/jpeg' ? 0.88 : undefined);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('تعذر قراءة الصورة.')); };
    image.src = objectUrl;
  });
}

export default function BrandsManager({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { text: string; ok: boolean }>>({});

  async function upload(brand: Brand, file: File) {
    setBusy(brand.id);
    setMessages((prev) => ({ ...prev, [brand.id]: { text: 'جارٍ تجهيز الصورة ورفعها...', ok: true } }));
    try {
      if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('الصورة يجب أن تكون PNG أو JPG.');
      const prepared = await compressImage(file);
      const body = new FormData();
      body.append('key', `brand:${brand.id}`);
      body.append('file', prepared);
      const response = await fetch('/api/admin/site-assets', { method: 'POST', body, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر رفع الصورة.');
      setBrands((prev) => prev.map((item) => item.id === brand.id ? { ...item, imageUrl: data.url } : item));
      setMessages((prev) => ({ ...prev, [brand.id]: { text: 'تم حفظ صورة الماركة بنجاح.', ok: true } }));
    } catch (error) {
      setMessages((prev) => ({ ...prev, [brand.id]: { text: error instanceof Error ? error.message : 'تعذر رفع الصورة.', ok: false } }));
    } finally {
      setBusy(null);
    }
  }

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {brands.map((brand) => {
      const message = messages[brand.id];
      return <article key={brand.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-5">
          {brand.imageUrl ? <img src={brand.imageUrl} alt={brand.name} className="max-h-full max-w-full object-contain" /> : <span className="text-2xl font-black text-white/80">{brand.name}</span>}
        </div>
        <h2 className="mt-4 text-lg font-black">{brand.name}</h2>
        <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm font-black text-sky-200 transition hover:bg-sky-400/15">
          {busy === brand.id ? 'جارٍ الرفع...' : brand.imageUrl ? 'تغيير الصورة' : 'رفع صورة الماركة'}
          <input hidden type="file" accept="image/png,image/jpeg" disabled={busy !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(brand, file); e.currentTarget.value = ''; }} />
        </label>
        {message && <p className={`mt-3 rounded-xl border p-3 text-xs ${message.ok ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>{message.text}</p>}
      </article>;
    })}
  </div>;
}

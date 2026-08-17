'use client';

import { useState } from 'react';

type AssetKey = 'logo' | 'hero' | 'hero2' | 'hero3' | 'fontRegular' | 'fontBold';
type UploadState = { busy: boolean; message: string; ok?: boolean };
const initial: Record<AssetKey, UploadState> = { logo: { busy: false, message: '' }, hero: { busy: false, message: '' }, hero2: { busy: false, message: '' }, hero3: { busy: false, message: '' }, fontRegular: { busy: false, message: '' }, fontBold: { busy: false, message: '' } };

function compressImage(file: File, maxWidth: number, maxHeight: number) {
  return new Promise<File>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('تعذر تجهيز الصورة.'));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = type === 'image/jpeg' ? 0.86 : undefined;
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('تعذر ضغط الصورة.'));
        const extension = type === 'image/png' ? 'png' : 'jpg';
        resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, { type }));
      }, type, quality);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('تعذر قراءة الصورة.')); };
    image.src = objectUrl;
  });
}

export default function SiteBrandingSettings() {
  const [state, setState] = useState(initial);
  async function upload(key: AssetKey, file: File) {
    setState((prev) => ({ ...prev, [key]: { busy: true, message: 'جارٍ التجهيز والرفع...' } }));
    try {
      let prepared = file;
      if (key === 'logo') prepared = await compressImage(file, 1200, 600);
      if (key === 'hero' || key === 'hero2' || key === 'hero3') prepared = await compressImage(file, 2400, 1600);
      const body = new FormData(); body.append('key', key); body.append('file', prepared);
      const response = await fetch('/api/admin/site-assets', { method: 'POST', body, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل الرفع.');
      setState((prev) => ({ ...prev, [key]: { busy: false, message: 'تم الرفع والتفعيل بنجاح.', ok: true } }));
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      setState((prev) => ({ ...prev, [key]: { busy: false, message: error instanceof Error ? error.message : 'تعذر رفع الملف.', ok: false } }));
    }
  }
  function Field({ keyName, title, hint, accept }: { keyName: AssetKey; title: string; hint: string; accept: string }) {
    const item = state[keyName];
    return <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-black">{title}</h3><p className="mt-1 text-xs leading-6 text-slate-500">{hint}</p></div><label className="cursor-pointer rounded-xl border border-sky-300/25 bg-sky-400/10 px-4 py-2.5 text-sm font-black text-sky-200 transition hover:bg-sky-400/15">{item.busy ? 'جارٍ الرفع...' : 'اختيار ملف'}<input hidden type="file" accept={accept} disabled={item.busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(keyName, file); e.currentTarget.value = ''; }} /></label></div>{item.message && <p className={`mt-3 rounded-xl border p-3 text-sm ${item.ok ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>{item.message}</p>}</div>;
  }

  return <section className="glass mt-5 rounded-3xl p-7"><div className="mb-6"><span className="luxury-badge">BRAND SYSTEM</span><h2 className="mt-3 text-xl font-extrabold">هوية الموقع والصورة الرئيسية</h2><p className="mt-2 text-sm leading-7 text-slate-400">ارفع الشعار والصور الثلاث للعرض الرئيسي والخطوط. تتغير الواجهة مباشرة بعد نجاح الرفع.</p></div><div className="grid gap-4 lg:grid-cols-2">
    <Field keyName="logo" title="شعار المتجر" hint="PNG أو JPG. يفضّل نسخة بخلفية شفافة." accept="image/png,image/jpeg" />
    <Field keyName="hero" title="صورة العرض الأولى" hint="PNG أو JPG. تظهر في الشريحة الأولى." accept="image/png,image/jpeg" />
    <Field keyName="hero2" title="صورة العرض الثانية" hint="PNG أو JPG. تظهر في الشريحة الثانية." accept="image/png,image/jpeg" />
    <Field keyName="hero3" title="صورة العرض الثالثة" hint="PNG أو JPG. تظهر في الشريحة الثالثة." accept="image/png,image/jpeg" />
    <Field keyName="fontRegular" title="الخط العادي" hint="TTF أو OTF. يطبق على نصوص الموقع العادية." accept=".ttf,.otf,font/ttf,font/otf" />
    <Field keyName="fontBold" title="الخط العريض" hint="TTF أو OTF. يطبق على العناوين والأزرار والأوزان الثقيلة." accept=".ttf,.otf,font/ttf,font/otf" />
  </div></section>;
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ASSET_RULES = {
  logo: { maxBytes: 5 * 1024 * 1024, mimes: ['image/png', 'image/jpeg'], prefix: 'branding/logo' },
  hero: { maxBytes: 10 * 1024 * 1024, mimes: ['image/png', 'image/jpeg'], prefix: 'branding/hero' },
  fontRegular: { maxBytes: 8 * 1024 * 1024, mimes: ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-opentype', 'application/octet-stream'], prefix: 'fonts/regular' },
  fontBold: { maxBytes: 8 * 1024 * 1024, mimes: ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-opentype', 'application/octet-stream'], prefix: 'fonts/bold' },
} as const;

type AssetKey = keyof typeof ASSET_RULES;

function extFor(file: File) {
  const clean = file.name.split('?')[0].split('#')[0];
  const ext = clean.includes('.') ? clean.split('.').pop()?.toLowerCase() : '';
  if (ext === 'jpeg') return 'jpg';
  if (ext === 'ttf' || ext === 'otf' || ext === 'png' || ext === 'jpg') return ext;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type.includes('opentype')) return 'otf';
  return 'ttf';
}

function decodePathFromUrl(url: string) {
  const marker = '/storage/v1/object/public/site-assets/';
  const idx = url.indexOf(marker);
  return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length)) : null;
}

async function assertAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return false;
  const { data: admin } = await supabase.from('admins').select('id').eq('id', userId).eq('is_active', true).maybeSingle();
  return Boolean(admin);
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

  try {
    const form = await request.formData();
    const key = String(form.get('key') || '') as AssetKey;
    const file = form.get('file');
    const rule = ASSET_RULES[key];

    if (!rule || !(file instanceof File)) {
      return NextResponse.json({ error: 'ملف أو نوع رفع غير صالح.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!rule.mimes.includes(file.type as never)) {
      return NextResponse.json({ error: key.startsWith('font') ? 'الخط يجب أن يكون TTF أو OTF.' : 'الصورة يجب أن تكون PNG أو JPG.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    if (file.size > rule.maxBytes) {
      return NextResponse.json({ error: 'حجم الملف أكبر من الحد المسموح.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const admin = createAdminClient() as any;
    const { data: old } = await admin.from('site_assets').select('url').eq('key', key).maybeSingle();
    const version = Date.now();
    const path = `${rule.prefix}/${version}-${crypto.randomUUID()}.${extFor(file)}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from('site-assets').upload(path, bytes, { contentType: file.type, cacheControl: '0', upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = admin.storage.from('site-assets').getPublicUrl(path);
    const url = `${publicUrlData.publicUrl}?v=${version}`;
    const { error: saveError } = await admin.from('site_assets').upsert({ key, url, version, mime_type: file.type, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (saveError) {
      await admin.storage.from('site-assets').remove([path]);
      throw saveError;
    }

    const oldPath = old?.url ? decodePathFromUrl(old.url) : null;
    if (oldPath) await admin.storage.from('site-assets').remove([oldPath]);

    return NextResponse.json({ ok: true, key, url, version, message: 'تم رفع الملف وتفعيله بنجاح.' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Site asset upload failed:', error);
    return NextResponse.json({ error: 'تعذر حفظ الملف. حاول مرة أخرى.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

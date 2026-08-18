import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return false;
  const { data: admin } = await supabase.from('admins').select('id').eq('id', userId).eq('is_active', true).maybeSingle();
  return Boolean(admin);
}

function startsWith(bytes: Uint8Array, values: number[]) {
  return values.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array) {
  return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
}

function detectImageType(bytes: Uint8Array) {
  if (bytes.byteLength < 16) return '';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (isWebp(bytes)) return 'image/webp';
  return '';
}

async function downloadValidImage(imageUrl: string) {
  const parsed = new URL(imageUrl);
  const allowedHosts = new Set(['fdn2.gsmarena.com', 'fdn.gsmarena.com']);
  if (!allowedHosts.has(parsed.hostname)) throw new Error('مصدر الصورة غير مسموح.');

  const source = await fetch(imageUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/2.0)',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      referer: 'https://www.gsmarena.com/',
    },
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });
  if (!source.ok) throw new Error(`تعذر تنزيل الصورة (${source.status}).`);

  const bytes = new Uint8Array(await source.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error('الصورة أكبر من الحد المسموح.');
  const detectedType = detectImageType(bytes);
  if (!detectedType) throw new Error('المصدر لم يُرجع ملف صورة حقيقيًا.');
  return { bytes: Buffer.from(bytes), contentType: detectedType };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { imageUrl?: string; pageUrl?: string; alt?: string } | null;
  const imageUrl = String(body?.imageUrl || '').trim();
  if (!imageUrl) return NextResponse.json({ error: 'رابط الصورة مطلوب.' }, { status: 400 });

  const admin = createAdminClient() as any;
  const { data: product } = await admin.from('products').select('id,name').eq('id', id).maybeSingle();
  if (!product) return NextResponse.json({ error: 'المنتج غير موجود.' }, { status: 404 });

  try {
    const { bytes, contentType } = await downloadValidImage(imageUrl);
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${id}/import-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage.from('product-images').upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false });
    if (uploadError) return NextResponse.json({ error: 'تعذر حفظ الصورة في التخزين.' }, { status: 500 });

    const { data: publicUrl } = admin.storage.from('product-images').getPublicUrl(path);
    const { data: existing } = await admin.from('product_images').select('position').eq('product_id', id).order('position', { ascending: false }).limit(1);
    const position = existing?.[0] ? Number(existing[0].position ?? 0) + 1 : 0;
    if (position === 0) await admin.from('product_images').update({ is_primary: false }).eq('product_id', id);

    const { data: row, error: insertError } = await admin.from('product_images').insert({
      product_id: id,
      url: publicUrl.publicUrl,
      position,
      alt_text: body?.alt || product.name,
      is_primary: position === 0,
    }).select('*').single();

    if (insertError) {
      await admin.storage.from('product-images').remove([path]);
      return NextResponse.json({ error: 'تعذر ربط الصورة بالمنتج.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, row, source: body?.pageUrl || imageUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر استيراد الصورة.' }, { status: 422 });
  }
}

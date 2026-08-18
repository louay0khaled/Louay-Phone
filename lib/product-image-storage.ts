import { createAdminClient } from '@/lib/supabase/admin';

function startsWith(bytes: Uint8Array, values: number[]) {
  return values.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array) {
  return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
}

export function detectImageType(bytes: Uint8Array) {
  if (bytes.byteLength < 16) return '';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (isWebp(bytes)) return 'image/webp';
  return '';
}

export async function downloadValidProductImage(imageUrl: string) {
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
  const contentType = detectImageType(bytes);
  if (!contentType) throw new Error('المصدر لم يُرجع ملف صورة حقيقيًا.');
  return { bytes: Buffer.from(bytes), contentType };
}

export async function saveProductImage(productId: string, productName: string, imageUrl: string, pageUrl?: string) {
  const admin = createAdminClient() as any;
  const { bytes, contentType } = await downloadValidProductImage(imageUrl);
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${productId}/import-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage.from('product-images').upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = admin.storage.from('product-images').getPublicUrl(path);
  const { data: existing } = await admin.from('product_images').select('position').eq('product_id', productId).order('position', { ascending: false }).limit(1);
  const position = existing?.[0] ? Number(existing[0].position ?? 0) + 1 : 0;
  if (position === 0) await admin.from('product_images').update({ is_primary: false }).eq('product_id', productId);

  const { data: row, error: insertError } = await admin.from('product_images').insert({
    product_id: productId,
    url: publicUrl.publicUrl,
    position,
    alt_text: productName,
    is_primary: position === 0,
  }).select('*').single();

  if (insertError) {
    await admin.storage.from('product-images').remove([path]);
    throw insertError;
  }

  return { row, source: pageUrl || imageUrl };
}

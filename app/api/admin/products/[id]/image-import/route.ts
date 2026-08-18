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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { imageUrl?: string; pageUrl?: string; alt?: string } | null;
  const imageUrl = String(body?.imageUrl || '').trim();
  if (!imageUrl) return NextResponse.json({ error: 'رابط الصورة مطلوب.' }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(imageUrl); } catch { return NextResponse.json({ error: 'رابط الصورة غير صالح.' }, { status: 400 }); }
  const allowedHosts = new Set(['fdn2.gsmarena.com', 'fdn.gsmarena.com']);
  if (!allowedHosts.has(parsed.hostname)) return NextResponse.json({ error: 'يسمح حاليًا باستيراد صور GSMArena فقط.' }, { status: 400 });

  const admin = createAdminClient() as any;
  const { data: product } = await admin.from('products').select('id,name').eq('id', id).maybeSingle();
  if (!product) return NextResponse.json({ error: 'المنتج غير موجود.' }, { status: 404 });

  const source = await fetch(imageUrl, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/1.0)' }, cache: 'no-store' });
  if (!source.ok) return NextResponse.json({ error: 'تعذر تنزيل الصورة من المصدر.' }, { status: 422 });
  const contentType = source.headers.get('content-type') || '';
  if (!/^image\/(jpeg|png|webp)$/i.test(contentType)) return NextResponse.json({ error: 'المصدر لم يُرجع ملف صورة صالحًا.' }, { status: 422 });
  const bytes = Buffer.from(await source.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) return NextResponse.json({ error: 'الصورة أكبر من الحد المسموح.' }, { status: 422 });

  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${id}/import-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage.from('product-images').upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false });
  if (uploadError) return NextResponse.json({ error: 'تعذر حفظ الصورة في التخزين.' }, { status: 500 });
  const { data: publicUrl } = admin.storage.from('product-images').getPublicUrl(path);

  const { data: existing } = await admin.from('product_images').select('id').eq('product_id', id).order('position', { ascending: false }).limit(1);
  const position = existing?.[0] ? Number(existing[0].position ?? 0) + 1 : 0;
  if (position === 0) await admin.from('product_images').update({ is_primary: false }).eq('product_id', id);
  const { data: row, error: insertError } = await admin.from('product_images').insert({ product_id: id, url: publicUrl.publicUrl, position, alt_text: body?.alt || product.name, is_primary: position === 0 }).select('*').single();
  if (insertError) {
    await admin.storage.from('product-images').remove([path]);
    return NextResponse.json({ error: 'تعذر ربط الصورة بالمنتج.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row, source: body?.pageUrl || imageUrl }, { headers: { 'Cache-Control': 'no-store' } });
}

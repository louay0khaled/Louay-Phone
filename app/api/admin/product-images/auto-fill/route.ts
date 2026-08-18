import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildProductSearchQuery, discoverProductImages } from '@/lib/product-image-discovery';

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

export async function POST(request: Request) {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.min(8, Math.max(1, Number(url.searchParams.get('limit') || 5)));
  const admin = createAdminClient() as any;
  const { data: products, error } = await admin
    .from('products')
    .select('id,name,model,brands(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر تحميل المنتجات.' }, { status: 500 });

  const missingIds = new Set<string>();
  const { data: imageRows } = await admin.from('product_images').select('product_id').in('product_id', (products ?? []).map((p: any) => p.id));
  const withImages = new Set((imageRows ?? []).map((row: any) => row.product_id));
  for (const product of products ?? []) if (!withImages.has(product.id)) missingIds.add(product.id);

  const batch = (products ?? []).filter((p: any) => missingIds.has(p.id)).slice(0, limit);
  const results: Array<{ id: string; name: string; status: string; source?: string }> = [];

  for (const product of batch) {
    const brand = Array.isArray(product.brands) ? product.brands[0]?.name : product.brands?.name;
    const query = buildProductSearchQuery(brand, product.name, product.model);
    try {
      const candidates = await discoverProductImages(query);
      const best = candidates[0];
      if (!best) { results.push({ id: product.id, name: product.name, status: 'no-match' }); continue; }
      const source = await fetch(best.imageUrl, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/1.0)' }, cache: 'no-store' });
      if (!source.ok) { results.push({ id: product.id, name: product.name, status: 'download-failed' }); continue; }
      const contentType = source.headers.get('content-type') || '';
      if (!/^image\/(jpeg|png|webp)$/i.test(contentType)) { results.push({ id: product.id, name: product.name, status: 'invalid-image' }); continue; }
      const bytes = Buffer.from(await source.arrayBuffer());
      if (bytes.byteLength > 8 * 1024 * 1024) { results.push({ id: product.id, name: product.name, status: 'too-large' }); continue; }
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const path = `${product.id}/auto-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await admin.storage.from('product-images').upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false });
      if (uploadError) { results.push({ id: product.id, name: product.name, status: 'upload-failed' }); continue; }
      const { data: publicUrl } = admin.storage.from('product-images').getPublicUrl(path);
      const { error: insertError } = await admin.from('product_images').insert({ product_id: product.id, url: publicUrl.publicUrl, position: 0, alt_text: product.name, is_primary: true });
      if (insertError) {
        await admin.storage.from('product-images').remove([path]);
        results.push({ id: product.id, name: product.name, status: 'database-failed' });
        continue;
      }
      results.push({ id: product.id, name: product.name, status: 'imported', source: best.pageUrl });
    } catch {
      results.push({ id: product.id, name: product.name, status: 'failed' });
    }
  }

  const remaining = missingIds.size - batch.length;
  return NextResponse.json({ processed: batch.length, remaining: Math.max(0, remaining), results }, { headers: { 'Cache-Control': 'no-store' } });
}

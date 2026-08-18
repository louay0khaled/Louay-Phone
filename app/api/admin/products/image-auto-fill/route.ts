import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildProductSearchQuery, discoverProductImages } from '@/lib/product-image-discovery';
import { saveProductImage } from '@/lib/product-image-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAdminClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: admin } = await supabase.from('admins').select('id').eq('id', userId).eq('is_active', true).maybeSingle();
  return admin ? supabase : null;
}

export async function POST(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { limit?: number; offset?: number };
  const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 5);
  const offset = Math.max(Number(body.offset) || 0, 0);
  const admin = supabase as any;

  const { data: products, error } = await admin
    .from('products')
    .select('id,name,model,brands(name),product_images(id)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: 'تعذر قراءة المنتجات.' }, { status: 500 });

  const missing = (products ?? []).filter((product: any) => !(product.product_images?.length));
  const queue = missing.slice(offset, offset + limit);
  const results: any[] = [];

  for (const product of queue) {
    const brand = Array.isArray(product.brands) ? product.brands[0]?.name : product.brands?.name;
    const query = buildProductSearchQuery(brand, product.name, product.model);
    try {
      const candidates = await discoverProductImages(query);
      if (!candidates.length) {
        results.push({ id: product.id, name: product.name, status: 'not_found', query });
        continue;
      }
      const result = await saveProductImage(product.id, product.name, candidates[0].imageUrl, candidates[0].pageUrl);
      results.push({ id: product.id, name: product.name, status: 'imported', query, source: result.source });
    } catch (e) {
      results.push({ id: product.id, name: product.name, status: 'error', query, error: e instanceof Error ? e.message : 'تعذر الاستيراد' });
    }
  }

  return NextResponse.json({
    processed: results.length,
    imported: results.filter((result) => result.status === 'imported').length,
    notFound: results.filter((result) => result.status === 'not_found').length,
    results,
    totalMissing: missing.length,
    nextOffset: offset + queue.length,
    remainingMissing: Math.max(0, missing.length - results.filter((result) => result.status === 'imported').length),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

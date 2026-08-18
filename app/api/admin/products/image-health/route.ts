import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectImageType } from '@/lib/product-image-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: admin } = await supabase.from('admins').select('id').eq('id', userId).eq('is_active', true).maybeSingle();
  return admin ? supabase : null;
}

export async function POST() {
  const supabase = await getAdmin();
  if (!supabase) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const admin = supabase as any;
  const { data: products, error } = await admin
    .from('products')
    .select('id,name,product_images(id,url,is_primary)')
    .eq('is_active', true)
    .limit(1000);
  if (error) return NextResponse.json({ error: 'تعذر قراءة الصور.' }, { status: 500 });

  const invalid: any[] = [];
  for (const product of products ?? []) {
    for (const image of product.product_images ?? []) {
      try {
        const response = await fetch(image.url, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!detectImageType(bytes)) throw new Error('ملف غير صالح');
      } catch (e) {
        invalid.push({ productId: product.id, productName: product.name, imageId: image.id, url: image.url, error: e instanceof Error ? e.message : 'غير صالح' });
      }
    }
  }

  return NextResponse.json({ checkedProducts: products?.length ?? 0, invalid, invalidCount: invalid.length }, { headers: { 'Cache-Control': 'no-store' } });
}

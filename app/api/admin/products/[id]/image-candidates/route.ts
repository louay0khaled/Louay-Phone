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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient() as any;
  const { data: product, error } = await admin.from('products').select('id,name,model,brands(name)').eq('id', id).maybeSingle();
  if (error || !product) return NextResponse.json({ error: 'المنتج غير موجود.' }, { status: 404 });
  const brand = Array.isArray(product.brands) ? product.brands[0]?.name : product.brands?.name;
  const query = buildProductSearchQuery(brand, product.name, product.model);
  const candidates = await discoverProductImages(query, { brand, name: product.name, model: product.model });
  return NextResponse.json({ query, candidates }, { headers: { 'Cache-Control': 'private, no-store' } });
}

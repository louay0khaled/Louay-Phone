import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildProductSearchQuery, discoverProductImages } from '@/lib/product-image-discovery';
import { buildMobileApiQuery, searchMobileApi } from '@/lib/mobileapi';

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

  const mobileQuery = buildMobileApiQuery(brand, product.name, product.model);
  try {
    const devices = await searchMobileApi(mobileQuery);
    const candidates = devices.slice(0, 6).flatMap((device) => [
      ...device.imageDataUrls.slice(0, 3).map((imageUrl) => ({ name: `${device.brand ? `${device.brand} ` : ''}${device.name}`, imageUrl, pageUrl: `mobileapi:${device.id ?? device.name}`, source: 'MobileAPI', confidence: 0.99 })),
      ...device.imageUrls.slice(0, 3).map((imageUrl) => ({ name: `${device.brand ? `${device.brand} ` : ''}${device.name}`, imageUrl, pageUrl: `mobileapi:${device.id ?? device.name}`, source: 'MobileAPI', confidence: 0.99 })),
    ]);
    if (candidates.length) return NextResponse.json({ query: mobileQuery, source: 'MobileAPI', candidates, specs: devices[0]?.specs ?? {} }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    // Fall through to GSMArena when MobileAPI is unavailable or the key is not configured.
  }

  const query = buildProductSearchQuery(brand, product.name, product.model);
  const candidates = await discoverProductImages(query, { brand, name: product.name, model: product.model });
  return NextResponse.json({ query, source: 'GSMArena', candidates, specs: {} }, { headers: { 'Cache-Control': 'private, no-store' } });
}

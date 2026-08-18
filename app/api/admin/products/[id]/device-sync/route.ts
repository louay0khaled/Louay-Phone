import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { buildMobileApiQuery, searchMobileApi } from '@/lib/mobileapi';

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

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getAdmin();
  if (!supabase) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { id } = await params;
  const admin = supabase as any;
  const { data: product, error } = await admin.from('products').select('id,name,model,specs,slug,brands(name)').eq('id', id).maybeSingle();
  if (error || !product) return NextResponse.json({ error: 'المنتج غير موجود.' }, { status: 404 });
  const brand = Array.isArray(product.brands) ? product.brands[0]?.name : product.brands?.name;
  const query = buildMobileApiQuery(brand, product.name, product.model);
  const devices = await searchMobileApi(query);
  const device = devices[0];
  if (!device) return NextResponse.json({ error: 'لم نجد جهازًا موثوقًا بهذا الاسم.' }, { status: 404 });

  const existing = product.specs && typeof product.specs === 'object' ? product.specs : {};
  const mergedSpecs = { ...(existing as Record<string, unknown>), ...device.specs };
  const { error: updateError } = await admin.from('products').update({ specs: mergedSpecs }).eq('id', id);
  if (updateError) return NextResponse.json({ error: 'تعذر حفظ المواصفات.' }, { status: 500 });
  revalidatePath(`/product/${product.slug}`, 'page');
  revalidatePath('/products', 'page');
  return NextResponse.json({ ok: true, query, matchedName: device.name, brand: device.brand, specs: device.specs, imageCount: device.imageUrls.length + device.imageDataUrls.length });
}

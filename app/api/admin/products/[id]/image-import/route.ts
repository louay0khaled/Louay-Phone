import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { saveProductImage } from '@/lib/product-image-storage';

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
  const body = await request.json().catch(() => null) as { imageUrl?: string; pageUrl?: string } | null;
  const imageUrl = String(body?.imageUrl || '').trim();
  if (!imageUrl) return NextResponse.json({ error: 'رابط الصورة مطلوب.' }, { status: 400 });

  const supabase = await createClient();
  const { data: product } = await supabase.from('products').select('id,name,slug').eq('id', id).maybeSingle();
  if (!product) return NextResponse.json({ error: 'المنتج غير موجود.' }, { status: 404 });

  try {
    const result = await saveProductImage(id, product.name, imageUrl, body?.pageUrl);
    revalidatePath(`/product/${product.slug}`, 'page');
    revalidatePath('/products', 'page');
    revalidatePath('/', 'page');
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر استيراد الصورة.' }, { status: 422 });
  }
}

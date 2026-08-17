import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicClient } from '@/lib/supabase/public';

const reviewSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

const recent = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function allowed(key: string) {
  const now = Date.now();
  const state = recent.get(key);
  if (!state || now - state.startedAt >= WINDOW_MS) {
    recent.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (state.count >= MAX_PER_WINDOW) return false;
  state.count += 1;
  recent.set(key, state);
  return true;
}

export async function POST(request: Request) {
  try {
    if (!allowed(clientKey(request))) return NextResponse.json({ error: 'التقييمات كثيرة حاليًا، حاول بعد قليل.' }, { status: 429, headers: { 'Retry-After': '60' } });
    const body = reviewSchema.parse(await request.json());
    const supabase = createPublicClient();

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', body.productId)
      .eq('is_active', true)
      .maybeSingle();

    if (productError) {
      console.error('Review product lookup failed:', productError);
      return NextResponse.json({ error: 'تعذر التحقق من الهاتف' }, { status: 500 });
    }

    if (!product) return NextResponse.json({ error: 'الهاتف غير موجود' }, { status: 404 });

    const { error } = await supabase.from('reviews').insert({
      product_id: body.productId,
      customer_name: body.customerName,
      rating: body.rating,
      comment: body.comment || null,
      is_approved: false,
    });

    if (error) {
      console.error('Review insert failed:', error);
      return NextResponse.json({ error: 'تعذر إرسال التقييم' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'تم إرسال تقييمك للمراجعة، شكرًا لك.' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'تحقق من البيانات المدخلة' }, { status: 400 });
    console.error('Review API failed:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const reviewSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

export async function POST(request: Request) {
  try {
    const body = reviewSchema.parse(await request.json());
    const supabase = await createClient();

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

    if (!product) {
      return NextResponse.json({ error: 'الهاتف غير موجود' }, { status: 404 });
    }

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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'تحقق من البيانات المدخلة' }, { status: 400 });
    }
    console.error('Review API failed:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}

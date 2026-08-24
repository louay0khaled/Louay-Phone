import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage, escapeHtml, getAdminChatId } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizePhone(value: string) {
  return value.trim().replace(/[\s()-]/g, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productId = String(body?.productId ?? '').trim();
    const name = String(body?.name ?? '').trim().replace(/\s+/g, ' ');
    const phone = normalizePhone(String(body?.phone ?? ''));
    const orderId = String(body?.orderId ?? '').trim();
    const rating = Number(body?.rating);
    const comment = String(body?.comment ?? '').trim();

    if (!productId || !orderId || !name || !phone || !/^\+?\d{7,20}$/.test(phone) || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1500) {
      return NextResponse.json({ error: 'يرجى إدخال بيانات التقييم بشكل صحيح.' }, { status: 400 });
    }

    const supabase = db();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id,status,product_id,customer_id')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.product_id !== productId || order.status !== 'confirmed') {
      return NextResponse.json({ error: 'لا يمكن إرسال تقييم قبل تأكيد طلب هذا الهاتف.' }, { status: 409 });
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id,name,phone')
      .eq('id', order.customer_id)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer || normalizePhone(customer.phone) !== phone) {
      return NextResponse.json({ error: 'رقم الهاتف لا يطابق بيانات الطلب.' }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id,is_approved')
      .eq('order_id', order.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'تم إرسال تقييم لهذا الطلب مسبقًا.' }, { status: 409 });
    }

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        order_id: order.id,
        customer_id: customer.id,
        customer_name: name,
        rating,
        comment: comment || null,
        is_approved: false,
      })
      .select('id,product_id,order_id,customer_name,rating,comment,is_approved,created_at')
      .single();
    if (reviewError || !review) throw reviewError ?? new Error('تعذر حفظ التقييم');

    const adminChatId = getAdminChatId();
    if (adminChatId !== null) {
      await sendTelegramMessage(
        adminChatId,
        `<b>⭐ تقييم جديد يحتاج مراجعة</b>\n<b>التقييم:</b> <code>${escapeHtml(review.id)}</code>\n<b>الطلب:</b> <code>${escapeHtml(order.id)}</code>\n<b>العميل:</b> ${escapeHtml(name)}\n<b>الهاتف:</b> ${escapeHtml(phone)}\n<b>النجوم:</b> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}\n<b>التعليق:</b> ${escapeHtml(comment || '—')}`,
        {
          inline_keyboard: [[
            { text: '✅ اعتماد', callback_data: `review:approve:${review.id}` },
            { text: '❌ رفض', callback_data: `review:reject:${review.id}` },
          ]],
        },
      ).catch((error) => console.error('Review Telegram notification failed:', error));
    }

    return NextResponse.json({ ok: true, reviewId: review.id }, { status: 201 });
  } catch (error) {
    console.error('Review POST error:', error);
    return NextResponse.json({ error: 'تعذر إرسال التقييم حاليًا.' }, { status: 500 });
  }
}

import { after } from 'next/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOrderNotification } from '@/lib/order-notifications';
import { VISITOR_TOKEN_COOKIE } from '@/lib/visitor-token';

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    if (request.headers.get('content-type')?.toLowerCase().split(';')[0] !== 'application/json') {
      return response({ error: 'صيغة الطلب غير مدعومة.' }, 415);
    }

    const body = await request.json();
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(VISITOR_TOKEN_COOKIE)?.value ?? '';
    const chatToken = String(body.chatToken ?? cookieToken).trim();
    const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
    const phone = String(body.phone ?? '').trim().replace(/[\s()-]/g, '');
    const address = String(body.address ?? '').trim();
    const notes = String(body.notes ?? '').trim();
    const productId = String(body.productId ?? '').trim();
    const installmentPlanId = String(body.installmentPlanId ?? '').trim() || null;

    if (!chatToken || chatToken.length < 20 || !name || !phone || !productId || name.length > 120 || phone.length > 40 || notes.length > 1000 || address.length > 250) {
      return response({ error: 'يرجى إدخال البيانات المطلوبة بشكل صحيح.' }, 400);
    }
    if (!/^[-_a-zA-Z0-9]{20,100}$/.test(chatToken)) return response({ error: 'جلسة المحادثة غير صالحة.' }, 400);
    if (!/^[+\d]{7,20}$/.test(phone)) return response({ error: 'يرجى إدخال رقم هاتف صحيح.' }, 400);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return response({ error: 'خدمة الطلب غير مهيأة على الخادم بعد.' }, 503);
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const [{ data: product, error: productError }, { data: plan }] = await Promise.all([
      supabase
        .from('products')
        .select('id,name,price_usd,price_syp,stock_status,is_active')
        .eq('id', productId)
        .maybeSingle(),
      installmentPlanId
        ? supabase
            .from('installment_plans')
            .select('id,months,first_payment_type,first_payment_value,total_price,monthly_amount,is_active')
            .eq('id', installmentPlanId)
            .eq('is_active', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (productError || !product?.is_active) return response({ error: 'المنتج غير متاح حاليًا.' }, 404);
    if (product.stock_status === 'out_of_stock') return response({ error: 'المنتج غير متوفر حاليًا.' }, 409);
    if (installmentPlanId && !plan) return response({ error: 'خطة التقسيط المختارة غير متاحة.' }, 409);

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentCustomers } = await supabase.from('customers').select('id').eq('phone', phone).limit(1);
    if (recentCustomers?.[0]?.id) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', recentCustomers[0].id)
        .gte('created_at', since);
      if ((count ?? 0) >= 3) {
        return response({ error: 'تم استلام عدة طلبات من هذا الرقم مؤخرًا. يرجى الانتظار قليلًا قبل إعادة المحاولة.' }, 429);
      }
    }

    let customerId = recentCustomers?.[0]?.id ?? null;
    if (customerId) {
      const { error } = await supabase.from('customers').update({ name, address: address || null }).eq('id', customerId);
      if (error) return response({ error: 'تعذر تحديث بيانات العميل.' }, 500);
    } else {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({ name, phone, address: address || null })
        .select('id')
        .single();
      if (error || !customer) return response({ error: 'تعذر حفظ بيانات العميل.' }, 500);
      customerId = customer.id;
    }

    const totalAmount = plan?.total_price ?? product.price_syp ?? product.price_usd ?? null;
    const firstPayment = plan
      ? plan.first_payment_type === 'percentage'
        ? Number(totalAmount || 0) * Number(plan.first_payment_value) / 100
        : Number(plan.first_payment_value)
      : null;

    const { data: result, error: orderError } = await supabase.rpc('create_order_with_conversation', {
      p_customer_id: customerId,
      p_product_id: product.id,
      p_installment_plan_id: plan?.id ?? null,
      p_status: 'new',
      p_notes: notes || null,
      p_total_amount: totalAmount,
      p_first_payment: firstPayment,
      p_monthly_amount: plan?.monthly_amount ?? null,
      p_months: plan?.months ?? null,
      p_visitor_token: chatToken,
      p_visitor_name: name,
    });

    if (orderError || !result?.[0]) {
      console.error('create_order_with_conversation failed', orderError);
      return response({ error: 'تعذر إنشاء الطلب.' }, 500);
    }

    const order = result[0];
    after(() => sendOrderNotification(order.order_id).catch((error) => console.error('Order notification failed:', error)));

    return response({
      ok: true,
      orderId: order.order_id,
      status: 'new',
      conversationId: order.conversation_id,
      ticketCode: order.ticket_code,
      telegramNotified: false,
    }, 200);
  } catch (error) {
    console.error('Order route error:', error);
    return response({ error: 'تعذر معالجة الطلب حاليًا.' }, 400);
  }
}

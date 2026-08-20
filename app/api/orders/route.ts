import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    if (request.headers.get('content-type')?.toLowerCase().split(';')[0] !== 'application/json') return response({ error: 'صيغة الطلب غير مدعومة.' }, 415);
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length && length > 20_000) return response({ error: 'حجم الطلب أكبر من المسموح.' }, 413);

    const body = await request.json();
    const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
    const phone = String(body.phone ?? '').trim().replace(/[\s()-]/g, '');
    const address = String(body.address ?? '').trim();
    const notes = String(body.notes ?? '').trim();
    const productId = String(body.productId ?? '').trim();

    if (!name || !phone || !productId || name.length > 120 || phone.length > 40 || notes.length > 1000 || address.length > 250) return response({ error: 'يرجى إدخال البيانات المطلوبة بشكل صحيح.' }, 400);
    if (!/^[+\d]{7,20}$/.test(phone)) return response({ error: 'يرجى إدخال رقم هاتف صحيح.' }, 400);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return response({ error: 'خدمة الطلب غير مهيأة على الخادم بعد.' }, 503);

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: product, error: productError } = await supabase.from('products').select('id,price_usd,stock_status,is_active').eq('id', productId).maybeSingle();
    if (productError || !product?.is_active) return response({ error: 'المنتج غير متاح حاليًا.' }, 404);
    if (product.stock_status === 'out_of_stock') return response({ error: 'المنتج غير متوفر حاليًا.' }, 409);

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentCustomers } = await supabase.from('customers').select('id').eq('phone', phone).limit(1);
    if (recentCustomers?.[0]?.id) {
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', recentCustomers[0].id).gte('created_at', since);
      if ((count ?? 0) >= 3) return response({ error: 'تم استلام عدة طلبات من هذا الرقم مؤخرًا. يرجى الانتظار قليلًا قبل إعادة المحاولة.' }, 429);
    }

    let customerId: string | null = recentCustomers?.[0]?.id ?? null;
    if (customerId) {
      await supabase.from('customers').update({ name, address: address || null }).eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase.from('customers').insert({ name, phone, address: address || null }).select('id').single();
      if (customerError || !newCustomer) return response({ error: 'تعذر حفظ بيانات العميل.' }, 500);
      customerId = newCustomer.id;
    }

    const { data: order, error: orderError } = await supabase.from('orders').insert({ customer_id: customerId, product_id: product.id, status: 'new', notes: notes || null, total_amount: product.price_usd ?? null }).select('id,status').single();
    if (orderError || !order) return response({ error: 'تعذر إنشاء الطلب.' }, 500);

    return response({ ok: true, orderId: order.id, status: order.status }, 200);
  } catch {
    return response({ error: 'تعذر معالجة الطلب حاليًا.' }, 400);
  }
}

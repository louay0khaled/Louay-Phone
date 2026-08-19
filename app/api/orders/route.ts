import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const address = String(body.address ?? '').trim();
    const notes = String(body.notes ?? '').trim();
    const productId = String(body.productId ?? '').trim();

    if (!name || !phone || !productId || name.length > 120 || phone.length > 40 || notes.length > 1000 || address.length > 250) {
      return NextResponse.json({ error: 'يرجى إدخال البيانات المطلوبة بشكل صحيح.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: 'خدمة الطلب غير مهيأة على الخادم بعد.' }, { status: 503 });

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: product, error: productError } = await supabase.from('products').select('id,price_usd,stock_status,is_active').eq('id', productId).maybeSingle();
    if (productError || !product?.is_active) return NextResponse.json({ error: 'المنتج غير متاح حاليًا.' }, { status: 404 });
    if (product.stock_status === 'out_of_stock') return NextResponse.json({ error: 'المنتج غير متوفر حاليًا.' }, { status: 409 });

    let customerId: string | null = null;
    const { data: existingCustomer } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle();
    if (existingCustomer?.id) customerId = existingCustomer.id;
    else {
      const { data: newCustomer, error: customerError } = await supabase.from('customers').insert({ name, phone, address: address || null }).select('id').single();
      if (customerError || !newCustomer) return NextResponse.json({ error: 'تعذر حفظ بيانات العميل.' }, { status: 500 });
      customerId = newCustomer.id;
    }

    const { data: order, error: orderError } = await supabase.from('orders').insert({ customer_id: customerId, product_id: product.id, status: 'new', notes: notes || null, total_amount: product.price_usd ?? null }).select('id,status').single();
    if (orderError || !order) return NextResponse.json({ error: 'تعذر إنشاء الطلب.' }, { status: 500 });

    return NextResponse.json({ ok: true, orderId: order.id, status: order.status });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة الطلب حاليًا.' }, { status: 400 });
  }
}

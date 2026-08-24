import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function response(body: Record<string, unknown>, status: number) { return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } }); }
function esc(value: string) { return value.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string)); }
async function notifyTelegram(text: string, orderId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '👀 مراجعة', callback_data: `order:${orderId}:reviewing` }, { text: '✅ تأكيد', callback_data: `order:${orderId}:confirmed` }, { text: '❌ إلغاء', callback_data: `order:${orderId}:cancelled` }]] } }) });
    return r.ok;
  } catch { return false; }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get('content-type')?.toLowerCase().split(';')[0] !== 'application/json') return response({ error: 'صيغة الطلب غير مدعومة.' }, 415);
    const body = await request.json();
    const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
    const phone = String(body.phone ?? '').trim().replace(/[\s()-]/g, '');
    const address = String(body.address ?? '').trim();
    const notes = String(body.notes ?? '').trim();
    const productId = String(body.productId ?? '').trim();
    const installmentPlanId = String(body.installmentPlanId ?? '').trim() || null;
    if (!name || !phone || !productId || name.length > 120 || phone.length > 40 || notes.length > 1000 || address.length > 250) return response({ error: 'يرجى إدخال البيانات المطلوبة بشكل صحيح.' }, 400);
    if (!/^[+\d]{7,20}$/.test(phone)) return response({ error: 'يرجى إدخال رقم هاتف صحيح.' }, 400);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return response({ error: 'خدمة الطلب غير مهيأة على الخادم بعد.' }, 503);
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const [{ data: product, error: productError }, { data: plan }] = await Promise.all([
      supabase.from('products').select('id,name,price_usd,price_syp,stock_status,is_active').eq('id', productId).maybeSingle(),
      installmentPlanId ? supabase.from('installment_plans').select('id,months,first_payment_type,first_payment_value,total_price,monthly_amount,is_active').eq('id', installmentPlanId).eq('is_active', true).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (productError || !product?.is_active) return response({ error: 'المنتج غير متاح حاليًا.' }, 404);
    if (product.stock_status === 'out_of_stock') return response({ error: 'المنتج غير متوفر حاليًا.' }, 409);
    if (installmentPlanId && !plan) return response({ error: 'خطة التقسيط المختارة غير متاحة.' }, 409);
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentCustomers } = await supabase.from('customers').select('id').eq('phone', phone).limit(1);
    if (recentCustomers?.[0]?.id) { const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', recentCustomers[0].id).gte('created_at', since); if ((count ?? 0) >= 3) return response({ error: 'تم استلام عدة طلبات من هذا الرقم مؤخرًا. يرجى الانتظار قليلًا قبل إعادة المحاولة.' }, 429); }
    let customerId: string | null = recentCustomers?.[0]?.id ?? null;
    if (customerId) await supabase.from('customers').update({ name, address: address || null }).eq('id', customerId);
    else { const { data: c, error } = await supabase.from('customers').insert({ name, phone, address: address || null }).select('id').single(); if (error || !c) return response({ error: 'تعذر حفظ بيانات العميل.' }, 500); customerId = c.id; }
    const totalAmount = plan?.total_price ?? product.price_syp ?? product.price_usd ?? null;
    const { data: order, error: orderError } = await supabase.from('orders').insert({ customer_id: customerId, product_id: product.id, installment_plan_id: plan?.id ?? null, status: 'new', notes: notes || null, total_amount: totalAmount, first_payment: plan ? (plan.first_payment_type === 'percentage' ? Number(totalAmount || 0) * Number(plan.first_payment_value) / 100 : Number(plan.first_payment_value)) : null, monthly_amount: plan?.monthly_amount ?? null, months: plan?.months ?? null }).select('id,status').single();
    if (orderError || !order) return response({ error: 'تعذر إنشاء الطلب.' }, 500);
    const ticketCode = `WEB-${order.id.slice(0, 8).toUpperCase()}`;
    const { data: conversation } = await supabase.from('conversations').insert({ customer_id: customerId, status: 'open', ticket_code: ticketCode, visitor_name: name }).select('id').single();
    if (conversation) await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'bot', message_text: `تم إنشاء الطلب ${order.id}`, is_read: true });
    const telegramText = `<b>🛍️ طلب جديد من الموقع</b>\n<b>الطلب:</b> <code>${esc(order.id)}</code>\n<b>الزبون:</b> ${esc(name)}\n<b>الهاتف:</b> ${esc(phone)}\n<b>العنوان:</b> ${esc(address)}\n<b>المنتج:</b> ${esc(product.name)}${plan ? `\n<b>التقسيط:</b> ${plan.months} أشهر\n<b>القسط:</b> ${Number(plan.monthly_amount ?? 0).toLocaleString('ar-SY')} ل.س` : ''}\n<b>الملاحظات:</b> ${esc(notes || '—')}`;
    const telegramNotified = await notifyTelegram(telegramText, order.id);
    return response({ ok: true, orderId: order.id, status: order.status, telegramNotified }, 200);
  } catch { return response({ error: 'تعذر معالجة الطلب حاليًا.' }, 400); }
}

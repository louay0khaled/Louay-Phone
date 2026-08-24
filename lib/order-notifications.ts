import { createClient } from '@supabase/supabase-js';
import { escapeHtml, getAdminChatId, sendTelegramMessage } from '@/lib/telegram';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function sendOrderNotification(orderId: string) {
  const supabase = db();
  const adminChatId = getAdminChatId();
  if (adminChatId === null) return false;

  const { data: claim, error: claimError } = await supabase.rpc('claim_order_notification', { p_order_id: orderId });
  if (claimError) throw claimError;
  if (claim !== true) return false;

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id,status,total_amount,notes,customer_id,product_id,conversation_id,installment_plan_id')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw new Error('Order not found');

    const [{ data: customer, error: customerError }, { data: product, error: productError }, { data: conversation, error: conversationError }, { data: plan, error: planError }] = await Promise.all([
      supabase.from('customers').select('name,phone,address,telegram_chat_id').eq('id', order.customer_id).maybeSingle(),
      supabase.from('products').select('name,model').eq('id', order.product_id).maybeSingle(),
      supabase.from('conversations').select('id,ticket_code').eq('id', order.conversation_id).maybeSingle(),
      order.installment_plan_id
        ? supabase.from('installment_plans').select('months,monthly_amount').eq('id', order.installment_plan_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (customerError) throw customerError;
    if (productError) throw productError;
    if (conversationError) throw conversationError;
    if (planError) throw planError;

    const ticket = conversation?.ticket_code || `WEB-${String(order.id).slice(0, 8).toUpperCase()}`;
    const text = [
      '<b>🛍️ طلب جديد</b>',
      `<b>الطلب:</b> <code>${escapeHtml(String(order.id))}</code>`,
      `<b>التذكرة:</b> <code>${escapeHtml(ticket)}</code>`,
      `<b>الزبون:</b> ${escapeHtml(String(customer?.name || '—'))}`,
      `<b>الهاتف:</b> ${escapeHtml(String(customer?.phone || '—'))}`,
      `<b>العنوان:</b> ${escapeHtml(String(customer?.address || '—'))}`,
      `<b>المنتج:</b> ${escapeHtml(String(product?.name || '—'))}${product?.model ? `\n<b>الموديل:</b> ${escapeHtml(String(product.model))}` : ''}`,
      `<b>المبلغ:</b> ${escapeHtml(String(order.total_amount ?? '—'))}`,
      plan ? `<b>التقسيط:</b> ${plan.months} أشهر · ${Number(plan.monthly_amount ?? 0).toLocaleString('ar-SY')} شهريًا` : '<b>الدفع:</b> كامل',
      `<b>الملاحظات:</b> ${escapeHtml(String(order.notes || '—'))}`,
    ].join('\n');

    await sendTelegramMessage(adminChatId, text, {
      inline_keyboard: [
        [
          { text: '👀 مراجعة', callback_data: `order:reviewing:${order.id}:${order.id.slice(-6)}` },
          { text: '✅ تأكيد', callback_data: `order:confirmed:${order.id}:${order.id.slice(-6)}` },
          { text: '❌ إلغاء', callback_data: `order:cancelled:${order.id}:${order.id.slice(-6)}` },
        ],
        [{ text: `✍️ رد ${ticket}`, callback_data: `reply:${ticket}:${order.id.slice(-6)}` }],
      ],
    });

    await supabase
      .from('order_notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
      .eq('order_id', orderId);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from('order_notifications')
      .update({ status: 'failed', last_error: message, updated_at: new Date().toISOString() })
      .eq('order_id', orderId);
    throw error;
  }
}

import { createClient } from '@supabase/supabase-js';
import {
  answerTelegramCallback,
  editTelegramReplyMarkup,
  escapeHtml,
  getAdminChatId,
  sendTelegramMessage,
} from '@/lib/telegram';

type R = Record<string, any>;
type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string; title?: string; username?: string };
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  text?: string;
  reply_to_message?: { message_id?: number; text?: string };
};
type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    message?: TelegramMessage;
  };
};

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseReplyCommand(text: string) {
  const match = text.match(/^\/reply(?:@\w+)?\s+(\S+)\s+([\s\S]+)$/i);
  return match ? { ticketId: match[1].trim().toUpperCase(), replyText: match[2].trim() } : null;
}

function displayName(message: TelegramMessage) {
  const from = message.from;
  return [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || from?.username || message.chat.title || 'مستخدم';
}

async function replyTicket(ticketId: string, replyText: string, sourceTelegramMessageId?: number) {
  const supabase = adminDb();
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id,ticket_code,telegram_chat_id,customer_id,status,visitor_name')
    .eq('ticket_code', ticketId.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return false;

  const { error: messageError } = await supabase.from('messages').insert({
    conversation_id: conversation.id,
    sender_type: 'admin',
    message_text: replyText,
    telegram_message_id: sourceTelegramMessageId ?? null,
    is_read: false,
  });
  if (messageError) throw messageError;

  await supabase.from('conversations').update({
    status: 'processing',
    last_message_at: new Date().toISOString(),
  }).eq('id', conversation.id);

  if (conversation.telegram_chat_id && Number(conversation.telegram_chat_id) !== Number(getAdminChatId())) {
    await sendTelegramMessage(conversation.telegram_chat_id, `رد الإدارة:\n\n${escapeHtml(replyText)}`);
  }

  return true;
}

async function handleAdminMessage(message: TelegramMessage) {
  const adminChatId = getAdminChatId();
  if (adminChatId === null || Number(message.chat.id) !== adminChatId || !message.text) return false;

  const text = message.text.trim();
  const direct = parseReplyCommand(text);
  const repliedText = String(message.reply_to_message?.text ?? '');
  const repliedTicket = repliedText.match(/\b(WEB|TG)-[A-Z0-9]+\b/i)?.[0]?.toUpperCase();
  const parsed = direct ?? (repliedTicket ? { ticketId: repliedTicket, replyText: text } : null);

  if (parsed) {
    const ok = await replyTicket(parsed.ticketId, parsed.replyText, message.message_id);
    await sendTelegramMessage(
      adminChatId,
      ok
        ? `✅ تم إرسال الرد على التذكرة <code>${escapeHtml(parsed.ticketId)}</code>.`
        : `⚠️ لم أجد التذكرة <code>${escapeHtml(parsed.ticketId)}</code>.`,
    );
    return true;
  }

  if (text === '/start' || text === '/help') {
    await sendTelegramMessage(adminChatId, 'البوت يعمل. للرد استخدم <code>/reply WEB-XXXX نص الرد</code> أو اضغط Reply على رسالة التذكرة ثم اكتب الرد.');
    return true;
  }
  return false;
}

async function sendOrderNotification(orderId: string) {
  const supabase = adminDb();
  const adminChatId = getAdminChatId();
  if (adminChatId === null) return;

  const { data: order } = await supabase
    .from('orders')
    .select('id,status,total_amount,notes,customer_id,product_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return;

  const [{ data: customer }, { data: product }, { data: conversation }] = await Promise.all([
    supabase.from('customers').select('name,phone,address,telegram_chat_id').eq('id', order.customer_id).maybeSingle(),
    supabase.from('products').select('name,model').eq('id', order.product_id).maybeSingle(),
    supabase.from('conversations').select('id,ticket_code').eq('customer_id', order.customer_id).order('last_message_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

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
    `<b>الملاحظات:</b> ${escapeHtml(String(order.notes || '—'))}`,
  ].join('\n');

  await sendTelegramMessage(adminChatId, text, {
    inline_keyboard: [
      [
        { text: '👀 مراجعة', callback_data: `order:${order.id}:reviewing` },
        { text: '✅ تأكيد', callback_data: `order:${order.id}:confirmed` },
        { text: '❌ إلغاء', callback_data: `order:${order.id}:cancelled` },
      ],
      [{ text: `✍️ رد ${ticket}`, callback_data: `reply:${ticket}` }],
    ],
  });
}

async function handleAdminCallback(query: NonNullable<TelegramUpdate['callback_query']>) {
  const adminChatId = getAdminChatId();
  if (adminChatId === null || Number(query.message?.chat.id) !== adminChatId) return false;
  await answerTelegramCallback(query.id);

  const data = String(query.data || '');
  const [kind, first, second] = data.split(':');
  const supabase = adminDb();

  if (kind === 'order' && ['reviewing', 'confirmed', 'cancelled'].includes(second)) {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: second })
      .eq('id', first)
      .select('id,customer_id')
      .maybeSingle();
    if (error || !order) {
      await sendTelegramMessage(adminChatId, `⚠️ تعذر تحديث الطلب <code>${escapeHtml(first)}</code>.`);
      return true;
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id,telegram_chat_id,ticket_code')
      .eq('customer_id', order.customer_id)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conversation && second !== 'reviewing') {
      const customerMessage = second === 'confirmed'
        ? '✅ تم تأكيد طلبك من فريق Louay Phone وسنتواصل معك لإتمام التفاصيل.'
        : '❌ تم إلغاء الطلب حاليًا. إذا كان ذلك غير مقصود، أرسل لنا رسالة.';
      await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'bot', message_text: customerMessage, is_read: true });
      await supabase.from('conversations').update({ status: second === 'confirmed' ? 'processing' : 'closed', last_message_at: new Date().toISOString() }).eq('id', conversation.id);
      if (conversation.telegram_chat_id && Number(conversation.telegram_chat_id) !== adminChatId) {
        await sendTelegramMessage(conversation.telegram_chat_id, customerMessage);
      }
    }

    if (query.message?.message_id) {
      await editTelegramReplyMarkup(adminChatId, query.message.message_id, []);
    }
    await sendTelegramMessage(adminChatId, `✅ تم تحديث الطلب <code>${escapeHtml(first)}</code> إلى <b>${escapeHtml(second)}</b>.`);
    return true;
  }

  if (kind === 'close') {
    await supabase.from('conversations').update({ status: 'closed', last_message_at: new Date().toISOString() }).eq('id', first);
    if (query.message?.message_id) await editTelegramReplyMarkup(adminChatId, query.message.message_id, []);
    await sendTelegramMessage(adminChatId, '✅ تم إغلاق المحادثة.');
    return true;
  }

  if (kind === 'reply') {
    await sendTelegramMessage(
      adminChatId,
      `✍️ الرد على التذكرة <code>${escapeHtml(first)}</code>\nاكتب الرد بالضغط على Reply على هذه الرسالة، أو استخدم /reply ${escapeHtml(first)} نص الرد.`,
      { force_reply: true, input_field_placeholder: 'اكتب رد الزبون هنا...' },
    );
    return true;
  }

  return true;
}

async function handleCustomerMessage(message: TelegramMessage) {
  if (!message.text) return;
  const adminChatId = getAdminChatId();
  const supabase = adminDb();
  const chatId = Number(message.chat.id);
  const fromId = Number(message.from?.id ?? chatId);
  const name = displayName(message);
  const username = message.from?.username ?? message.chat.username ?? null;
  const text = message.text.trim();

  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .or(`telegram_user_id.eq.${fromId},telegram_chat_id.eq.${chatId}`)
    .maybeSingle();

  let customerId = existingCustomer?.id as string | undefined;
  if (!customerId) {
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, phone: '', telegram_user_id: fromId, telegram_chat_id: chatId, telegram_username: username })
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('تعذر إنشاء العميل');
    customerId = data.id;
  } else {
    await supabase.from('customers').update({ name, telegram_user_id: fromId, telegram_chat_id: chatId, telegram_username: username }).eq('id', customerId);
  }

  const { data: existingConversation } = await supabase
    .from('conversations')
    .select('id,ticket_code,status')
    .eq('telegram_chat_id', chatId)
    .in('status', ['open', 'processing'])
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversation = existingConversation as R | null;
  if (!conversation) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ customer_id: customerId, telegram_chat_id: chatId, status: 'open', visitor_name: name, last_message_at: new Date().toISOString() })
      .select('id,ticket_code,status')
      .single();
    if (error || !data) throw error ?? new Error('تعذر إنشاء المحادثة');
    conversation = data;
  } else {
    await supabase.from('conversations').update({ visitor_name: name, last_message_at: new Date().toISOString(), status: 'open' }).eq('id', conversation.id);
  }

  await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'user', message_text: text, telegram_message_id: message.message_id, is_read: false });

  if (adminChatId !== null) {
    await sendTelegramMessage(adminChatId, [
      '<b>📩 رسالة جديدة من Telegram</b>',
      `<b>التذكرة:</b> <code>${escapeHtml(String(conversation.ticket_code))}</code>`,
      `<b>الاسم:</b> ${escapeHtml(name)}`,
      `<b>المعرف:</b> ${escapeHtml(username ?? '—')}`,
      '<b>الرسالة:</b>',
      escapeHtml(text),
      '',
      `<b>للرد:</b> <code>/reply ${escapeHtml(String(conversation.ticket_code))} نص الرد</code>`,
    ].join('\n'));
  }

  await sendTelegramMessage(chatId, text === '/start' ? 'أهلًا بك في Louay Phone 👋\nأرسل استفسارك أو اسم الهاتف الذي تريده، وسيتواصل معك فريقنا مباشرة.' : 'تم استلام رسالتك ✅ وسيتم الرد عليك من الإدارة قريبًا.');
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleAdminCallback(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message?.text) return;
  if (await handleAdminMessage(message)) return;
  await handleCustomerMessage(message);
}

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

async function replyTicket(ticketId: string, replyText: string, sourceTelegramMessageId?: number, sourceTelegramChatId?: number) {
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
    telegram_chat_id: sourceTelegramChatId ?? null,
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
  const repliedTicket = repliedText.match(/\b(WEB|TG|ORDER)-[A-Z0-9]+\b/i)?.[0]?.toUpperCase();
  const parsed = direct ?? (repliedTicket ? { ticketId: repliedTicket, replyText: text } : null);

  if (parsed) {
    const ok = await replyTicket(parsed.ticketId, parsed.replyText, message.message_id, adminChatId);
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

function parseCallback(data: string) {
  const parts = data.split(':');
  if (parts[0] === 'order' && parts.length >= 4 && ['reviewing', 'confirmed', 'cancelled'].includes(parts[1])) {
    return { kind: 'order', action: parts[1], entityId: parts[2], nonce: parts[3] };
  }
  if (parts[0] === 'order' && parts.length === 3 && ['reviewing', 'confirmed', 'cancelled'].includes(parts[2])) {
    return { kind: 'order', action: parts[2], entityId: parts[1], nonce: '' };
  }
  if (parts[0] === 'reply' && parts[1]) return { kind: 'reply', action: 'reply', entityId: parts[1], nonce: parts[2] ?? '' };
  if (parts[0] === 'close' && parts[1]) return { kind: 'close', action: 'close', entityId: parts[1], nonce: parts[2] ?? '' };
  return null;
}

async function claimCallback(callbackId: string) {
  const { data, error } = await adminDb().rpc('claim_telegram_callback', { p_callback_id: callbackId });
  if (error) throw error;
  return data === true;
}

async function setCallbackStatus(callbackId: string, status: 'succeeded' | 'failed') {
  await adminDb().from('telegram_processed_callbacks').update({ status }).eq('callback_id', callbackId);
}

async function audit(action: string, entity: string, entityId: string | null, metadata: Record<string, unknown>) {
  const { error } = await adminDb().from('audit_logs').insert({ action, entity, entity_id: entityId, metadata });
  if (error) console.error('Audit log failed:', error);
}

async function handleAdminCallback(query: NonNullable<TelegramUpdate['callback_query']>) {
  try {
    await answerTelegramCallback(query.id);
  } catch (error) {
    console.error('answerCallbackQuery failed:', error);
  }

  const adminChatId = getAdminChatId();
  if (adminChatId === null || Number(query.message?.chat.id) !== adminChatId) return false;
  if (!(await claimCallback(query.id))) return true;

  const parsed = parseCallback(String(query.data || ''));
  const supabase = adminDb();

  try {
    if (!parsed) {
      await setCallbackStatus(query.id, 'succeeded');
      return true;
    }

    if (parsed.kind === 'order') {
      const { data: order, error } = await supabase
        .from('orders')
        .select('id,status,customer_id,conversation_id')
        .eq('id', parsed.entityId)
        .maybeSingle();
      if (error) throw error;
      if (!order) throw new Error('Order not found');

      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ status: parsed.action })
        .eq('id', order.id)
        .select('id,status,conversation_id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updatedOrder) throw new Error('Order update failed');

      const conversation = updatedOrder.conversation_id
        ? (await supabase.from('conversations').select('id,telegram_chat_id,ticket_code').eq('id', updatedOrder.conversation_id).maybeSingle()).data
        : null;

      if (conversation && parsed.action !== 'reviewing') {
        const customerMessage = parsed.action === 'confirmed'
          ? '✅ تم تأكيد طلبك من فريق Louay Phone وسنتواصل معك لإتمام التفاصيل.'
          : '❌ تم إلغاء الطلب حاليًا. إذا كان ذلك غير مقصود، أرسل لنا رسالة.';
        await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'bot', message_text: customerMessage, is_read: true, telegram_chat_id: conversation.telegram_chat_id ?? null });
        await supabase.from('conversations').update({ status: parsed.action === 'confirmed' ? 'processing' : 'closed', last_message_at: new Date().toISOString() }).eq('id', conversation.id);
        if (conversation.telegram_chat_id && Number(conversation.telegram_chat_id) !== adminChatId) {
          await sendTelegramMessage(conversation.telegram_chat_id, customerMessage);
        }
      }

      if (query.message?.message_id) {
        await editTelegramReplyMarkup(adminChatId, query.message.message_id, []);
      }
      await audit('telegram_order_status', 'order', updatedOrder.id, { status: parsed.action, callback_id: query.id });
      await sendTelegramMessage(adminChatId, `✅ تم تحديث الطلب <code>${escapeHtml(updatedOrder.id)}</code> إلى <b>${escapeHtml(parsed.action)}</b>.`);
      await setCallbackStatus(query.id, 'succeeded');
      return true;
    }

    if (parsed.kind === 'close') {
      await supabase.from('conversations').update({ status: 'closed', last_message_at: new Date().toISOString() }).eq('id', parsed.entityId);
      if (query.message?.message_id) await editTelegramReplyMarkup(adminChatId, query.message.message_id, []);
      await audit('telegram_close_conversation', 'conversation', parsed.entityId, { callback_id: query.id });
      await sendTelegramMessage(adminChatId, '✅ تم إغلاق المحادثة.');
      await setCallbackStatus(query.id, 'succeeded');
      return true;
    }

    if (parsed.kind === 'reply') {
      await sendTelegramMessage(
        adminChatId,
        `✍️ الرد على التذكرة <code>${escapeHtml(parsed.entityId)}</code>\nاكتب الرد بالضغط على Reply على هذه الرسالة، أو استخدم /reply ${escapeHtml(parsed.entityId)} نص الرد.`,
        { force_reply: true, input_field_placeholder: 'اكتب رد الزبون هنا...' },
      );
      await setCallbackStatus(query.id, 'succeeded');
      return true;
    }

    await setCallbackStatus(query.id, 'succeeded');
    return true;
  } catch (error) {
    console.error('Telegram callback handler failed:', error);
    await setCallbackStatus(query.id, 'failed');
    await sendTelegramMessage(adminChatId, '⚠️ تعذر تنفيذ العملية. حاول الضغط مرة أخرى بعد لحظات.').catch(() => undefined);
    return true;
  }
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
    .maybeSingle();

  let conversation = existingConversation as R | null;
  if (!conversation) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ customer_id: customerId, telegram_chat_id: chatId, status: 'open', visitor_name: name, channel_origin: 'telegram', last_message_at: new Date().toISOString() })
      .select('id,ticket_code,status')
      .single();
    if (error || !data) throw error ?? new Error('تعذر إنشاء المحادثة');
    conversation = data;
  } else {
    await supabase.from('conversations').update({ visitor_name: name, last_message_at: new Date().toISOString(), status: 'open', channel_origin: 'telegram' }).eq('id', conversation.id);
  }

  const { data: existingMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .eq('telegram_message_id', message.message_id)
    .maybeSingle();
  if (!existingMessage) {
    await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'user', message_text: text, telegram_message_id: message.message_id, telegram_chat_id: chatId, is_read: false });
  }

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

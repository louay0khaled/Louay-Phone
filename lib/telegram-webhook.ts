import { createAdminClient } from '@/lib/supabase/admin';
import { escapeHtml, getAdminChatId, sendTelegramMessage } from '@/lib/telegram';

type TelegramMessage = { message_id: number; chat: { id: number; type: string; title?: string; username?: string }; from?: { id: number; first_name?: string; last_name?: string; username?: string }; text?: string };
type TelegramUpdate = { message?: TelegramMessage };

function parseReplyCommand(text: string) {
  const match = text.match(/^\/reply(?:@\w+)?\s+(\S+)\s+([\s\S]+)$/i);
  return match ? { ticketId: match[1], replyText: match[2].trim() } : null;
}

function displayName(message: TelegramMessage) {
  const from = message.from;
  return [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || from?.username || message.chat.title || 'مستخدم';
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!message?.text) return;

  // The database has evolved faster than the generated Supabase types. This handler
  // deliberately uses the runtime admin client shape because ticket_code/visitor fields
  // are production columns even when the generated type file is stale.
  const supabase = createAdminClient() as any;
  const adminChatId = getAdminChatId();
  const chatId = message.chat.id;
  const fromId = message.from?.id ?? chatId;
  const text = message.text.trim();
  const name = displayName(message);
  const username = message.from?.username ?? message.chat.username ?? null;

  if (adminChatId !== null && chatId === adminChatId) {
    if (text.startsWith('/reply')) {
      const parsed = parseReplyCommand(text);
      if (!parsed) {
        await sendTelegramMessage(adminChatId, 'صيغة الرد غير صحيحة. استخدم: <code>/reply ticket_id نص الرد</code>');
        return;
      }

      const { data: conversation, error: lookupError } = await supabase
        .from('conversations')
        .select('id,ticket_code,telegram_chat_id,customer_id,status')
        .eq('ticket_code', parsed.ticketId.trim().toUpperCase())
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!conversation) {
        await sendTelegramMessage(adminChatId, `لم أجد محادثة مرتبطة بالتذكرة <code>${escapeHtml(parsed.ticketId)}</code>.`);
        return;
      }

      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_type: 'admin',
        message_text: parsed.replyText,
        telegram_message_id: message.message_id,
        is_read: true,
      });
      if (messageError) throw messageError;

      await supabase.from('conversations').update({ status: 'processing', last_message_at: new Date().toISOString() }).eq('id', conversation.id);

      if (conversation.telegram_chat_id && conversation.telegram_chat_id !== adminChatId) {
        await sendTelegramMessage(conversation.telegram_chat_id, `رد الإدارة:\n\n${escapeHtml(parsed.replyText)}`);
      }

      await sendTelegramMessage(adminChatId, `تم إرسال الرد على التذكرة <code>${escapeHtml(parsed.ticketId)}</code>.`);
      return;
    }

    await sendTelegramMessage(adminChatId, 'البوت يعمل. للرد على زبون استخدم: <code>/reply ticket_id نص الرد</code>');
    return;
  }

  const { data: existingCustomer } = await supabase.from('customers').select('id').or(`telegram_user_id.eq.${fromId},telegram_chat_id.eq.${chatId}`).maybeSingle();
  let customerId: string | undefined = existingCustomer?.id;
  if (!customerId) {
    const { data, error } = await supabase.from('customers').insert({ name, phone: '', telegram_user_id: fromId, telegram_chat_id: chatId, telegram_username: username }).select('id').single();
    if (error) throw error;
    customerId = data.id;
  } else {
    await supabase.from('customers').update({ name, telegram_user_id: fromId, telegram_chat_id: chatId, telegram_username: username }).eq('id', customerId);
  }

  const { data: conversation } = await supabase.from('conversations').select('id,ticket_code').eq('telegram_chat_id', chatId).maybeSingle();
  let conversationId: string | undefined = conversation?.id;
  let ticketCode: string | undefined = conversation?.ticket_code;
  if (!conversationId) {
    const { data, error } = await supabase.from('conversations').insert({ customer_id: customerId, telegram_chat_id: chatId, status: 'open', last_message_at: new Date().toISOString() }).select('id,ticket_code').single();
    if (error) throw error;
    conversationId = data.id;
    ticketCode = data.ticket_code;
  } else {
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString(), status: 'open' }).eq('id', conversationId);
  }

  if (!conversationId) throw new Error('Telegram conversation could not be created');
  const { error: messageError } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_type: 'user', message_text: text, telegram_message_id: message.message_id, is_read: false });
  if (messageError) throw messageError;

  const safeTicket = ticketCode ?? conversationId;
  if (adminChatId !== null) {
    await sendTelegramMessage(adminChatId, ['<b>📩 رسالة جديدة من Telegram</b>', `<b>التذكرة:</b> <code>${escapeHtml(safeTicket)}</code>`, `<b>الاسم:</b> ${escapeHtml(name)}`, `<b>المعرف:</b> ${escapeHtml(username ?? '—')}`, '<b>الرسالة:</b>', escapeHtml(text), '', `<b>للرد:</b> <code>/reply ${escapeHtml(safeTicket)} نص الرد</code>`].join('\n'));
  }

  await sendTelegramMessage(chatId, text === '/start' ? 'أهلًا بك في Louay Phone. أرسل استفسارك أو اسم الهاتف الذي تريده، وسيتواصل معك فريقنا مباشرة.' : 'تم استلام رسالتك، وسيتم الرد عليك من الإدارة قريبًا.');
}

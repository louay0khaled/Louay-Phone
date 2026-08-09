import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { escapeHtml, getAdminChatId, sendTelegramMessage } from '@/lib/telegram';
export const dynamic = 'force-dynamic';
type TelegramUpdate = { message?: { message_id: number; chat: { id: number; type: string; title?: string; username?: string }; from?: { id: number; first_name?: string; last_name?: string; username?: string }; text?: string } };
function parseReplyCommand(text: string) { const match = text.match(/^\/reply(?:@\w+)?\s+(\S+)\s+([\s\S]+)$/i); return match ? { ticketId: match[1], replyText: match[2].trim() } : null; }
function extractDisplayName(message: NonNullable<TelegramUpdate['message']>) { const from = message.from; return [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || from?.username || message.chat.title || 'مستخدم'; }

export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });
    const supabase = createAdminClient() as any;
    const adminChatId = getAdminChatId();
    const chatId = message.chat.id;
    const fromId = message.from?.id ?? chatId;
    const text = message.text.trim();
    const displayName = extractDisplayName(message);
    const username = message.from?.username ?? message.chat.username ?? null;

    if (adminChatId !== null && chatId === adminChatId && text.startsWith('/reply')) {
      const parsed = parseReplyCommand(text);
      if (!parsed) { try { await sendTelegramMessage(adminChatId, 'صيغة الرد غير صحيحة. استخدم: <code>/reply ticket_id نص الرد</code>'); } catch {} return NextResponse.json({ ok: true }); }
      const isTicketCode = /^LP-[A-Z0-9]{6}$/.test(parsed.ticketId);
      const query = supabase.from('conversations').select('id,ticket_code,telegram_chat_id,customer_id,status,visitor_token');
      const { data: conversation, error: lookupError } = isTicketCode ? await query.eq('ticket_code', parsed.ticketId).maybeSingle() : await query.eq('id', parsed.ticketId).maybeSingle();
      if (lookupError) throw lookupError;
      if (!conversation) { try { await sendTelegramMessage(adminChatId, `لم أجد المحادثة <code>${escapeHtml(parsed.ticketId)}</code>.`); } catch {} return NextResponse.json({ ok: true }); }

      const targetChatId = conversation.telegram_chat_id as number | null;
      let telegramDelivered = false;
      if (targetChatId) {
        try { await sendTelegramMessage(targetChatId, `رد الإدارة:\n\n${escapeHtml(parsed.replyText)}`); telegramDelivered = true; } catch (error) { console.error('Telegram customer delivery failed:', error); }
      }

      const { error: messageError } = await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'admin', message_text: parsed.replyText, telegram_message_id: message.message_id, is_read: true });
      if (messageError) throw messageError;
      await supabase.from('conversations').update({ status: 'processing', last_message_at: new Date().toISOString() }).eq('id', conversation.id);

      try { await sendTelegramMessage(adminChatId, telegramDelivered ? `تم إرسال الرد على <code>${escapeHtml(conversation.ticket_code ?? parsed.ticketId)}</code> عبر Telegram.` : `تم إرسال الرد إلى محادثة الموقع <code>${escapeHtml(conversation.ticket_code ?? parsed.ticketId)}</code>.`); } catch {}
      return NextResponse.json({ ok: true, delivered: true, channel: telegramDelivered ? 'telegram' : 'website' });
    }

    const { data: existingCustomer } = await supabase.from('customers').select('id,telegram_user_id,telegram_chat_id,name').or(`telegram_user_id.eq.${fromId},telegram_chat_id.eq.${chatId}`).maybeSingle();
    let customerId = existingCustomer?.id as string | undefined;
    if (!customerId) { const { data: insertedCustomer, error } = await supabase.from('customers').insert({ name: displayName, phone: String(fromId), telegram_user_id: fromId, telegram_chat_id: chatId, telegram_username: username }).select('id').single(); if (error) throw error; customerId = insertedCustomer.id; }
    else await supabase.from('customers').update({ name: displayName, telegram_user_id: fromId, telegram_chat_id: chatId, telegram_username: username }).eq('id', customerId);

    const { data: conversation } = await supabase.from('conversations').select('id,ticket_code,telegram_chat_id').eq('telegram_chat_id', chatId).maybeSingle();
    let conversationId = conversation?.id as string | undefined;
    let ticketCode = conversation?.ticket_code as string | null | undefined;
    if (!conversationId) { const { data: insertedConversation, error } = await supabase.from('conversations').insert({ customer_id: customerId, telegram_chat_id: chatId, status: 'open' }).select('id,ticket_code').single(); if (error) throw error; conversationId = insertedConversation.id; ticketCode = insertedConversation.ticket_code; }
    else await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    if (!conversationId) throw new Error('Conversation could not be created');
    await supabase.from('messages').insert({ conversation_id: conversationId, sender_type: 'user', message_text: text, telegram_message_id: message.message_id, is_read: false });
    if (adminChatId !== null) { try { await sendTelegramMessage(adminChatId, [`<b>رسالة جديدة من Telegram</b>`,`<b>التذكرة:</b> <code>${escapeHtml(ticketCode ?? conversationId)}</code>`,`<b>الاسم:</b> ${escapeHtml(displayName)}`,`<b>المعرف:</b> ${escapeHtml(username ?? '—')}`,`<b>الرسالة:</b>`,escapeHtml(text),`\nللرد استخدم: <code>/reply ${escapeHtml(ticketCode ?? conversationId)} نص الرد</code>`].join('\n')); } catch {} }
    try { await sendTelegramMessage(chatId, text === '/start' ? 'أهلًا بك في Louay Phone. أرسل استفسارك أو اكتب اسم الهاتف الذي تريده، وسيصلك الرد من الإدارة مباشرة.' : 'تم استلام رسالتك، وسيتم الرد عليك من الإدارة قريبًا.'); } catch {}
    return NextResponse.json({ ok: true });
  } catch (error: any) { console.error('Telegram webhook error:', error); return NextResponse.json({ ok: false, error: error?.message ?? 'Webhook error' }, { status: 500 }); }
}

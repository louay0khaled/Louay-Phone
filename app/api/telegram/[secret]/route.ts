import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { escapeHtml, getAdminChatId, sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

type TelegramUpdate = {
  message?: {
    message_id: number;
    chat: { id: number; type: string; title?: string; username?: string };
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    text?: string;
  };
};

function parseReplyCommand(text: string) {
  const match = text.match(/^\/reply(?:@\w+)?\s+(\S+)\s+([\s\S]+)$/i);
  if (!match) return null;
  return { ticketId: match[1], replyText: match[2].trim() };
}

function extractDisplayName(message: NonNullable<TelegramUpdate['message']>) {
  const from = message.from;
  return [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || from?.username || message.chat.title || 'مستخدم';
}

export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const supabase = createAdminClient();
    const adminChatId = getAdminChatId();
    const chatId = message.chat.id;
    const fromId = message.from?.id ?? chatId;
    const text = message.text.trim();
    const displayName = extractDisplayName(message);
    const username = message.from?.username ?? message.chat.username ?? null;

    if (adminChatId !== null && chatId === adminChatId && text.startsWith('/reply')) {
      const parsed = parseReplyCommand(text);
      if (!parsed) {
        await sendTelegramMessage(adminChatId, 'صيغة الرد غير صحيحة. استخدم: <code>/reply ticket_id نص الرد</code>');
        return NextResponse.json({ ok: true });
      }

      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, telegram_chat_id, customer_id')
        .eq('id', parsed.ticketId)
        .maybeSingle();

      let targetChatId: number | null = conversation?.telegram_chat_id ?? null;
      let conversationId: string | null = conversation?.id ?? null;

      if (!targetChatId) {
        const { data: order } = await supabase
          .from('orders')
          .select('id, customer_id, customers!orders_customer_id_fkey(telegram_chat_id)')
          .eq('id', parsed.ticketId)
          .maybeSingle();

        targetChatId = (order?.customers as any)?.telegram_chat_id ?? null;
      }

      if (!targetChatId) {
        await sendTelegramMessage(adminChatId, `لم أجد محادثة مرتبطة بالتذكرة <code>${escapeHtml(parsed.ticketId)}</code>.`);
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(targetChatId, `رد الإدارة:\n\n${escapeHtml(parsed.replyText)}`);

      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_type: 'admin',
          message_text: parsed.replyText,
          telegram_message_id: message.message_id,
        });
        await supabase.from('conversations').update({ status: 'processing', last_message_at: new Date().toISOString() }).eq('id', conversationId);
      }

      await sendTelegramMessage(adminChatId, `تم إرسال الرد على <code>${escapeHtml(parsed.ticketId)}</code>.`);
      return NextResponse.json({ ok: true });
    }

    // User message flow
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id,telegram_user_id,telegram_chat_id,name')
      .or(`telegram_user_id.eq.${fromId},telegram_chat_id.eq.${chatId}`)
      .maybeSingle();

    let customerId = existingCustomer?.id as string | undefined;
    if (!customerId) {
      const { data: insertedCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: displayName,
          phone: String(fromId),
          telegram_user_id: fromId,
          telegram_chat_id: chatId,
          telegram_username: username,
        })
        .select('id')
        .single();
      if (customerError) throw customerError;
      customerId = insertedCustomer.id;
    } else {
      await supabase
        .from('customers')
        .update({
          name: displayName,
          telegram_user_id: fromId,
          telegram_chat_id: chatId,
          telegram_username: username,
        })
        .eq('id', customerId);
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, telegram_chat_id')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    let conversationId = conversation?.id as string | undefined;
    if (!conversationId) {
      const { data: insertedConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({ customer_id: customerId, telegram_chat_id: chatId, status: 'open' })
        .select('id')
        .single();
      if (conversationError) throw conversationError;
      conversationId = insertedConversation.id;
    } else {
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    }

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'user',
      message_text: text,
      telegram_message_id: message.message_id,
      is_read: false,
    });

    if (adminChatId !== null) {
      await sendTelegramMessage(
        adminChatId,
        [
          `<b>رسالة جديدة من Telegram</b>`,
          `<b>التذكرة:</b> ${escapeHtml(conversationId)}`,
          `<b>الاسم:</b> ${escapeHtml(displayName)}`,
          `<b>المعرف:</b> ${escapeHtml(username ?? '—')}`,
          `<b>الرسالة:</b>`,
          escapeHtml(text),
          `\nللرد استخدم: <code>/reply ${escapeHtml(conversationId)} نص الرد</code>`,
        ].join('\n'),
      );
    }

    if (text === '/start') {
      await sendTelegramMessage(chatId, 'أهلًا بك في Louay Phone. أرسل استفسارك أو اكتب اسم الهاتف الذي تريده، وسيصلك الرد من الإدارة مباشرة.');
    } else {
      await sendTelegramMessage(chatId, 'تم استلام رسالتك، وسيتم الرد عليك من الإدارة قريبًا.');
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Webhook error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { escapeHtml, getAdminChatId, sendTelegramMessage } from '@/lib/telegram';

const COOKIE = 'louay_chat_visitor';
const messageSchema = z.object({
  ticketId: z.string().regex(/^LP-[A-Z0-9]{6}$/),
  message: z.string().trim().min(1).max(2000),
  name: z.string().trim().min(2).max(80).optional(),
});

function token() { return crypto.randomUUID().replaceAll('-', ''); }
function ticketCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'LP-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function getOrCreateConversation() {
  const store = await cookies();
  let visitorToken = store.get(COOKIE)?.value;
  const db = createAdminClient() as any;
  if (visitorToken) {
    const { data } = await db.from('conversations').select('id,ticket_code,visitor_name,status,last_message_at').eq('visitor_token', visitorToken).maybeSingle();
    if (data) return { db, conversation: data };
  }
  visitorToken = token();
  let conversation: any = null;
  for (let attempt = 0; attempt < 3 && !conversation; attempt++) {
    const { data, error } = await db.from('conversations').insert({ visitor_token: visitorToken, ticket_code: ticketCode(), status: 'open', last_message_at: new Date().toISOString() }).select('id,ticket_code,visitor_name,status,last_message_at').single();
    if (!error) conversation = data;
  }
  if (!conversation) throw new Error('Unable to create chat ticket');
  store.set(COOKIE, visitorToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 180, path: '/' });
  return { db, conversation };
}

export async function GET() {
  try {
    const { db, conversation } = await getOrCreateConversation();
    const { data: messages, error } = await db.from('messages').select('id,sender_type,message_text,created_at,is_read').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(100);
    if (error) throw error;
    return NextResponse.json({ ticketId: conversation.ticket_code, messages: messages ?? [], status: conversation.status });
  } catch (error) {
    console.error('Chat GET failed:', error);
    return NextResponse.json({ error: 'تعذر فتح المحادثة' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = messageSchema.parse(await request.json());
    const { db, conversation } = await getOrCreateConversation();
    if (conversation.ticket_code !== body.ticketId) return NextResponse.json({ error: 'المحادثة غير صالحة' }, { status: 403 });
    if (conversation.status === 'closed') return NextResponse.json({ error: 'هذه المحادثة مغلقة' }, { status: 409 });

    if (body.name && !conversation.visitor_name) await db.from('conversations').update({ visitor_name: body.name }).eq('id', conversation.id);
    const { error } = await db.from('messages').insert({ conversation_id: conversation.id, sender_type: 'customer', message_text: body.message, is_read: false });
    if (error) throw error;
    await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

    const adminChatId = getAdminChatId();
    if (adminChatId !== null) {
      try {
        await sendTelegramMessage(adminChatId, [
          '<b>💬 رسالة جديدة من المتجر</b>',
          `<b>التذكرة:</b> <code>${escapeHtml(conversation.ticket_code)}</code>`,
          `<b>الاسم:</b> ${escapeHtml(body.name || conversation.visitor_name || 'زائر')}`,
          '<b>الرسالة:</b>',
          escapeHtml(body.message),
          '',
          `<b>للرد:</b> <code>/reply ${escapeHtml(conversation.ticket_code)} نص الرد</code>`,
        ].join('\n'));
      } catch (telegramError) {
        console.error('Telegram notification failed:', telegramError);
      }
    }
    return NextResponse.json({ ok: true, ticketId: conversation.ticket_code });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'الرسالة غير صالحة' }, { status: 400 });
    console.error('Chat POST failed:', error);
    return NextResponse.json({ error: 'تعذر إرسال الرسالة' }, { status: 500 });
  }
}

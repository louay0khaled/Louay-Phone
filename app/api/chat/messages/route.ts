import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminChatId, sendTelegramMessage, escapeHtml } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().min(20).max(128), text: z.string().trim().min(1).max(2000), name: z.string().trim().min(2).max(80).optional() });
const recent = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function allowed(token: string) {
  const now = Date.now();
  for (const [key, state] of recent) {
    if (now - state.startedAt >= WINDOW_MS) recent.delete(key);
  }
  const state = recent.get(token);
  if (!state || now - state.startedAt >= WINDOW_MS) {
    recent.set(token, { startedAt: now, count: 1 });
    return true;
  }
  if (state.count >= MAX_PER_WINDOW) return false;
  state.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (!allowed(body.token)) return NextResponse.json({ error: 'أرسلت رسائل كثيرة، حاول بعد قليل.' }, { status: 429, headers: { 'Retry-After': '60' } });
    const supabase = createAdminClient() as any;
    const { data: conversation, error: conversationError } = await supabase.from('conversations').select('id,ticket_code,visitor_name,status').eq('visitor_token', body.token).maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return NextResponse.json({ error: 'انتهت جلسة المحادثة. افتحها من جديد.' }, { status: 404 });
    if (conversation.status === 'closed') return NextResponse.json({ error: 'تم إغلاق المحادثة. افتح محادثة جديدة.' }, { status: 409 });

    if (body.name && body.name !== conversation.visitor_name) {
      const { error: nameUpdateError } = await supabase.from('conversations').update({ visitor_name: body.name }).eq('id', conversation.id);
      if (nameUpdateError) throw nameUpdateError;
    }

    const { data: message, error } = await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'user', message_text: body.text, is_read: false }).select('id,created_at').single();
    if (error) throw error;
    const { error: conversationUpdateError } = await supabase.from('conversations').update({ last_message_at: new Date().toISOString(), status: 'open' }).eq('id', conversation.id);
    if (conversationUpdateError) throw conversationUpdateError;

    const adminChatId = getAdminChatId();
    if (adminChatId) {
      try { await sendTelegramMessage(adminChatId, [`<b>💬 رسالة جديدة من الموقع</b>`,`<b>التذكرة:</b> <code>${escapeHtml(conversation.ticket_code)}</code>`,`<b>الاسم:</b> ${escapeHtml(body.name || conversation.visitor_name || 'زائر')}`,`<b>الرسالة:</b>`,escapeHtml(body.text),``,`<i>للرد:</i> <code>/reply ${escapeHtml(conversation.ticket_code)} نص الرد</code>`].join('\\n')); } catch (telegramError) { console.error('Chat Telegram notification failed:', telegramError); }
    }
    return NextResponse.json({ ok: true, message: { id: message.id, text: body.text, senderType: 'user', createdAt: message.created_at }, ticketId: conversation.ticket_code });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'بيانات الرسالة غير صالحة.' }, { status: 400 });
    console.error('Chat message error:', error);
    return NextResponse.json({ error: 'تعذر إرسال الرسالة.' }, { status: 500 });
  }
}

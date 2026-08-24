import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getConversation(token: string) {
  const supabase = db();
  const { data, error } = await supabase
    .from('conversations')
    .select('id,ticket_code,status,visitor_name,telegram_chat_id')
    .eq('visitor_token', token)
    .maybeSingle();
  if (error || !data) return null;
  return { supabase, conversation: data };
}

async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {
    // Customer chat must not fail just because the notification channel is unavailable.
  }
}

function esc(value: string) {
  return value.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' } as Record<string, string>)[c]);
}

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token')?.trim() || '';
    if (token.length < 20) return NextResponse.json({ error: 'جلسة المحادثة غير صالحة.' }, { status: 401 });
    const result = await getConversation(token);
    if (!result) return NextResponse.json({ error: 'المحادثة غير موجودة.' }, { status: 404 });
    const { data: messages, error } = await result.supabase
      .from('messages')
      .select('id,sender_type,message_text,created_at,is_read')
      .eq('conversation_id', result.conversation.id)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ conversation: result.conversation, messages: messages ?? [] }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'تعذر تحميل المحادثة.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body?.token ?? '').trim();
    const text = String(body?.message ?? '').trim().replace(/\s+/g, ' ');
    if (token.length < 20) return NextResponse.json({ error: 'جلسة المحادثة غير صالحة.' }, { status: 401 });
    if (!text || text.length > 2000) return NextResponse.json({ error: 'اكتب رسالة بين 1 و2000 محرف.' }, { status: 400 });

    const result = await getConversation(token);
    if (!result) return NextResponse.json({ error: 'المحادثة غير موجودة.' }, { status: 404 });
    const { supabase, conversation } = result;

    if (conversation.status === 'closed') {
      await supabase.from('conversations').update({ status: 'open' }).eq('id', conversation.id);
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversation.id, sender_type: 'user', message_text: text, is_read: false })
      .select('id,sender_type,message_text,created_at,is_read')
      .single();
    if (error || !message) throw error ?? new Error('تعذر حفظ الرسالة');

    await supabase.from('conversations').update({ status: 'processing', last_message_at: new Date().toISOString() }).eq('id', conversation.id);

    await notifyTelegram(
      `<b>💬 رسالة جديدة من الموقع</b>\n<b>التذكرة:</b> <code>${esc(conversation.ticket_code)}</code>\n<b>الزبون:</b> ${esc(conversation.visitor_name || 'زائر')}\n\n${esc(text)}\n\n<b>للرد:</b> <code>/reply ${esc(conversation.ticket_code)} نص الرد</code>`,
    );

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'تعذر إرسال الرسالة حاليًا.' }, { status: 500 });
  }
}

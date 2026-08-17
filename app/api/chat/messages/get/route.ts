import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().min(20).max(128) });
const recent = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function allowed(key: string) {
  const now = Date.now();
  const state = recent.get(key);
  if (!state || now - state.startedAt >= WINDOW_MS) {
    recent.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (state.count >= MAX_PER_WINDOW) return false;
  state.count += 1;
  recent.set(key, state);
  return true;
}

export async function POST(request: Request) {
  try {
    if (!allowed(clientKey(request))) return NextResponse.json({ error: 'طلبات كثيرة، حاول بعد قليل.' }, { status: 429, headers: { 'Retry-After': '60' } });
    const { token } = schema.parse(await request.json());
    const supabase = createAdminClient() as any;
    const { data: conversation } = await supabase.from('conversations').select('id,ticket_code,status,visitor_name').eq('visitor_token', token).maybeSingle();
    if (!conversation) return NextResponse.json({ error: 'المحادثة غير موجودة.' }, { status: 404 });
    const { data: messages, error } = await supabase.from('messages').select('id,sender_type,message_text,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(200);
    if (error) throw error;
    return NextResponse.json({ ok: true, ticketId: conversation.ticket_code, status: conversation.status, visitorName: conversation.visitor_name, messages: (messages ?? []).map((m: any) => ({ id: m.id, senderType: m.sender_type, text: m.message_text, createdAt: m.created_at })) });
  } catch (error) {
    console.error('Chat messages fetch error:', error);
    return NextResponse.json({ error: 'تعذر تحميل المحادثة.' }, { status: 500 });
  }
}

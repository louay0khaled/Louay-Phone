import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().min(20).max(128).optional(), name: z.string().trim().min(2).max(80).optional() });
const newToken = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
const recent = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

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
    if (!allowed(clientKey(request))) return NextResponse.json({ error: 'طلبات المحادثة كثيرة، حاول بعد قليل.' }, { status: 429, headers: { 'Retry-After': '60' } });
    const body = schema.parse(await request.json().catch(() => ({})));
    const supabase = createAdminClient() as any;
    let token = body.token;
    let conversation: any = null;
    if (token) {
      const { data } = await supabase.from('conversations').select('id,ticket_code,status,visitor_name').eq('visitor_token', token).maybeSingle();
      conversation = data;
    }
    if (!conversation) {
      token = newToken();
      const { data, error } = await supabase.from('conversations').insert({ visitor_token: token, visitor_name: body.name ?? null, telegram_chat_id: null, status: 'open' }).select('id,ticket_code,status,visitor_name').single();
      if (error) throw error;
      conversation = data;
    } else if (body.name && body.name !== conversation.visitor_name) {
      await supabase.from('conversations').update({ visitor_name: body.name }).eq('id', conversation.id);
      conversation.visitor_name = body.name;
    }
    return NextResponse.json({ ok: true, token, ticketId: conversation.ticket_code, conversationId: conversation.id });
  } catch (error) {
    console.error('Chat session error:', error);
    return NextResponse.json({ error: 'تعذر فتح المحادثة.' }, { status: 500 });
  }
}

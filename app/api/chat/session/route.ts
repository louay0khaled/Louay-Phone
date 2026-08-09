import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().min(20).max(128).optional(), name: z.string().trim().min(2).max(80).optional() });
const newToken = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');

export async function POST(request: Request) {
  try {
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

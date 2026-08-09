import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().min(20).max(128) });

export async function POST(request: Request) {
  try {
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

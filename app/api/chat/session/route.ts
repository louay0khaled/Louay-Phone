import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { VISITOR_TOKEN_COOKIE } from '@/lib/visitor-token';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(VISITOR_TOKEN_COOKIE)?.value ?? '';
    const requestedToken = String(body?.token ?? '').trim();
    const token = requestedToken || cookieToken || crypto.randomUUID();
    const name = String(body?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120) || 'زائر الموقع';
    if (!/^[a-zA-Z0-9_-]{20,100}$/.test(token)) {
      return NextResponse.json({ error: 'جلسة المحادثة غير صالحة.' }, { status: 400 });
    }

    const supabase = db();
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('id,ticket_code,status,visitor_name')
      .eq('visitor_token', token)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      const response = NextResponse.json({ token, conversation: existing });
      response.cookies.set({ name: VISITOR_TOKEN_COOKIE, value: token, maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax', httpOnly: false });
      return response;
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({ name, phone: 'web-chat' })
      .select('id')
      .single();
    if (customerError || !customer) throw customerError ?? new Error('تعذر إنشاء العميل');

    const ticketCode = `WEB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        customer_id: customer.id,
        status: 'open',
        ticket_code: ticketCode,
        visitor_name: name,
        visitor_token: token,
        channel_origin: 'web',
        last_message_at: new Date().toISOString(),
      })
      .select('id,ticket_code,status,visitor_name')
      .single();
    if (error || !conversation) throw error ?? new Error('تعذر إنشاء المحادثة');

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_type: 'bot',
      message_text: 'أهلًا فيك 👋 اكتب استفسارك هون، ورح نتابعه معك مباشرة.',
      is_read: true,
    });

    const response = NextResponse.json({ token, conversation });
    response.cookies.set({ name: VISITOR_TOKEN_COOKIE, value: token, maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax', httpOnly: false });
    return response;
  } catch (error) {
    console.error('Chat session error:', error);
    return NextResponse.json({ error: 'تعذر بدء المحادثة حاليًا.' }, { status: 503 });
  }
}

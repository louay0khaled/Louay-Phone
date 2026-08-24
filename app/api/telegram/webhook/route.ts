import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
const SUPABASE_URL = 'https://gmpogiiqydoxoclxcvwh.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-bot-v5`;

export async function GET() {
  return NextResponse.json({ ok: true, service: 'telegram-webhook' });
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  try {
    const body = await request.text();
    const headers = new Headers({ 'content-type': 'application/json' });
    if (expectedSecret) headers.set('x-telegram-bot-api-secret-token', expectedSecret);
    const upstream = await fetch(FUNCTION_URL, { method: 'POST', headers, body, cache: 'no-store' });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('Telegram webhook proxy failed:', error);
    return NextResponse.json({ ok: false, error: 'webhook unavailable' }, { status: 502 });
  }
}

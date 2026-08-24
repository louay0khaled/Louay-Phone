import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SUPABASE_URL = 'https://gmpogiiqydoxoclxcvwh.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-bot`;

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
    const upstreamHeaders = new Headers({ 'content-type': 'application/json' });
    if (expectedSecret) upstreamHeaders.set('x-telegram-bot-api-secret-token', expectedSecret);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: upstreamHeaders,
      body,
      cache: 'no-store',
    });

    const payload = await response.text();
    return new NextResponse(payload || JSON.stringify({ ok: response.ok }), {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('Telegram webhook proxy failed:', error);
    return NextResponse.json({ ok: false, error: 'webhook unavailable' }, { status: 502 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const allowedEvents = new Set(['page_view', 'product_view', 'order_start', 'chat_start', 'review_submit']);

function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventName = typeof body?.eventName === 'string' ? body.eventName.trim() : '';
    const path = typeof body?.path === 'string' ? body.path.slice(0, 500) : '';
    if (!allowedEvents.has(eventName) || !path) return NextResponse.json({ ok: false }, { status: 400 });

    const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
    const referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 1000) : null;

    const { error } = await getAdminDb().from('analytics_events').insert({ event_name: eventName, path, referrer, metadata });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Analytics event failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'Louay Phone Analytics' });
}

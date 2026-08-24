import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get('authorization');
  if (!expected || received !== `Bearer ${expected}`) return NextResponse.json({ ok: false }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Supabase server credentials are missing' }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { error: refreshError } = await supabase.rpc('refresh_analytics_daily', { p_day: yesterday });
  if (refreshError) return NextResponse.json({ ok: false, error: refreshError.message }, { status: 500 });

  const { data: pruned, error: pruneError } = await supabase.rpc('prune_analytics_events');
  if (pruneError) console.error('Analytics prune failed:', pruneError);

  return NextResponse.json({ ok: true, day: yesterday, pruned: pruned ?? 0 });
}

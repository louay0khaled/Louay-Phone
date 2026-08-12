import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowed = new Map([
  ['regular', 'fontRegular'],
  ['bold', 'fontBold'],
] as const);

export async function GET(request: Request) {
  const weight = new URL(request.url).searchParams.get('weight') ?? '';
  const key = allowed.get(weight as 'regular' | 'bold');
  if (!key) return new NextResponse('Not found', { status: 404 });

  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from('site_assets')
    .select('url,mime_type')
    .eq('key', key)
    .maybeSingle();

  if (error || !data?.url) return new NextResponse('Font not configured', { status: 404 });

  const upstream = await fetch(data.url, { cache: 'no-store' });
  if (!upstream.ok) return new NextResponse('Font unavailable', { status: 502 });

  const contentType = String(data.mime_type || '').toLowerCase().includes('opentype')
    ? 'font/otf'
    : String(data.mime_type || '').toLowerCase().includes('truetype')
      ? 'font/ttf'
      : upstream.headers.get('content-type') || 'application/octet-stream';

  return new NextResponse(await upstream.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

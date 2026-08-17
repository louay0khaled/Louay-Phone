import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

const allowed = new Map([
  ['regular', 'fontRegular'],
  ['bold', 'fontBold'],
] as const);

type FontAsset = { url: string; mime_type: string | null };

export async function GET(request: Request) {
  const weight = new URL(request.url).searchParams.get('weight') ?? '';
  const key = allowed.get(weight as 'regular' | 'bold');
  if (!key) return new NextResponse('Not found', { status: 404 });

  const supabase = createPublicClient();
  const { data: rawData, error } = await supabase
    .from('site_assets')
    .select('url,mime_type')
    .eq('key', key)
    .maybeSingle();
  const data = rawData as FontAsset | null;

  if (error || !data?.url) return new NextResponse('Font not configured', { status: 404 });

  const upstream = await fetch(data.url, { next: { revalidate: 86400 } });
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
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

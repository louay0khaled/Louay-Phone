import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readRate(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return Number(v.usd_to_syp ?? v.rate ?? 0);
  }
  return 0;
}

function assetUrl(row: any) {
  return row?.url ?? row?.public_url ?? row?.path ?? null;
}

export async function GET() {
  try {
    const supabase = createAdminClient() as any;

    const [assetsResult, productsResult, productCountResult, brandCountResult, settingsResult] = await Promise.all([
      supabase.from('site_assets').select('*'),
      supabase
        .from('products')
        .select('id,name,slug,price_usd,price_syp,installment_enabled,product_images(id,url,alt_text,is_primary,position),brands(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('brands').select('id', { count: 'exact', head: true }),
      supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
    ]);

    if (assetsResult.error) throw assetsResult.error;
    if (productsResult.error) throw productsResult.error;
    if (settingsResult.error) throw settingsResult.error;

    const rows = (assetsResult.data ?? []) as any[];
    const byKey = (key: string) => rows.find((row) => row?.key === key || row?.asset_key === key || row?.name === key);
    const heroSlides = rows
      .filter((row) => {
        const key = String(row?.key ?? row?.asset_key ?? row?.name ?? '');
        return key === 'hero' || /^hero\d+$/i.test(key) || /^hero[-_ ]?\d+$/i.test(key);
      })
      .map((row) => ({
        key: String(row?.key ?? row?.asset_key ?? row?.name ?? ''),
        url: assetUrl(row),
        version: row?.version ?? row?.updated_at ?? Date.now(),
      }))
      .filter((row) => row.url)
      .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

    const logo = byKey('logo');
    const fontRegular = byKey('fontRegular');
    const fontBold = byKey('fontBold');

    return NextResponse.json({
      assets: {
        logo: logo ? { url: assetUrl(logo), version: logo.version ?? Date.now() } : null,
        heroSlides,
        fontRegular: fontRegular ? { url: assetUrl(fontRegular), version: fontRegular.version ?? Date.now() } : null,
        fontBold: fontBold ? { url: assetUrl(fontBold), version: fontBold.version ?? Date.now() } : null,
      },
      products: productsResult.data ?? [],
      exchangeRate: { usd_to_syp: readRate(settingsResult.data?.value) },
      stats: {
        productCount: productCountResult.count ?? 0,
        brandCount: brandCountResult.count ?? 0,
      },
    }, {
      headers: { 'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate' },
    });
  } catch (error) {
    console.error('home-data:', error);
    return NextResponse.json({ error: 'تعذر تحميل بيانات الصفحة الرئيسية.' }, { status: 500 });
  }
}

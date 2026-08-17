import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export type SiteAsset = { key: string; url: string; version: number; mime_type: string };

type SiteAssets = {
  logo?: SiteAsset;
  hero?: SiteAsset;
  hero2?: SiteAsset;
  hero3?: SiteAsset;
  fontRegular?: SiteAsset;
  fontBold?: SiteAsset;
};

async function loadSiteAssets(): Promise<SiteAssets> {
  const admin = createAdminClient() as any;
  const { data } = await admin.from('site_assets').select('key,url,version,mime_type').in('key', ['logo', 'hero', 'hero2', 'hero3', 'fontRegular', 'fontBold']);
  const assets: Record<string, SiteAsset> = {};
  for (const item of data ?? []) assets[item.key] = item;
  return assets as SiteAssets;
}

const getCachedSiteAssets = unstable_cache(loadSiteAssets, ['louay-site-assets'], { revalidate: 3600 });

export async function getSiteAssets() {
  return getCachedSiteAssets();
}

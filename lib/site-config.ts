import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export type SiteAsset = { key: string; url: string; version: number; mime_type: string };

export async function getSiteAssets() {
  noStore();
  const admin = createAdminClient() as any;
  const { data } = await admin.from('site_assets').select('key,url,version,mime_type').in('key', ['logo', 'hero', 'hero2', 'hero3', 'fontRegular', 'fontBold']);
  const assets: Record<string, SiteAsset> = {};
  for (const item of data ?? []) assets[item.key] = item;
  return assets as {
    logo?: SiteAsset;
    hero?: SiteAsset;
    hero2?: SiteAsset;
    hero3?: SiteAsset;
    fontRegular?: SiteAsset;
    fontBold?: SiteAsset;
  };
}

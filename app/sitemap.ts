import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://louay-phone.vercel.app';
  const admin = createAdminClient() as any;
  const [{ data: products }, { data: brands }] = await Promise.all([
    admin.from('products').select('slug,updated_at').eq('is_active', true).order('updated_at', { ascending: false }),
    admin.from('brands').select('slug,updated_at').order('updated_at', { ascending: false }),
  ]);
  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: 'daily', priority: 0.9 },
    ...((brands ?? []).filter((brand: any) => brand.slug).map((brand: any) => ({ url: `${siteUrl}/products/brand/${brand.slug}`, changeFrequency: 'daily' as const, priority: 0.7, lastModified: brand.updated_at ? new Date(brand.updated_at) : undefined }))),
    ...((products ?? []).map((product: any) => ({ url: `${siteUrl}/product/${product.slug}`, changeFrequency: 'daily' as const, priority: 0.8, lastModified: product.updated_at ? new Date(product.updated_at) : undefined }))),
  ];
}

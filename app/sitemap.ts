import type { MetadataRoute } from 'next';
import { getActiveProductRows } from '@/lib/products';

const baseUrl = 'https://louay-phone.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getActiveProductRows(500);
  return [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, changeFrequency: 'daily', priority: 0.9 },
    ...products.map((product) => ({ url: `${baseUrl}/product/${product.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}

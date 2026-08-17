import { getCachedProduct, getCachedReviews } from '@/lib/storefront-cache';
import ReviewsSection from '@/components/store/ReviewsSection';

export const revalidate = 300;

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { product } = await getCachedProduct(slug);
  const reviews = product ? await getCachedReviews(product.id) : [];

  return (
    <>
      {children}
      {product && <ReviewsSection productId={product.id} reviews={reviews} />}
    </>
  );
}

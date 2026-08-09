import { createClient } from '@/lib/supabase/server';
import ReviewsSection from '@/components/store/ReviewsSection';

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  let reviews: Array<{ id: string; customer_name: string; rating: number; comment: string | null; created_at: string }> = [];
  if (product) {
    const { data } = await supabase
      .from('reviews')
      .select('id,customer_name,rating,comment,created_at')
      .eq('product_id', product.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    reviews = data ?? [];
  }

  return (
    <>
      {children}
      {product && <ReviewsSection productId={product.id} reviews={reviews} />}
    </>
  );
}

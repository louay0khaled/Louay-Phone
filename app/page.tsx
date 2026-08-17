import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import HomeStorefront from '@/components/store/HomeStorefront';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Louay Phone | هواتف وأسعار حقيقية في سوريا',
  description: 'تصفّح الهواتف المتوفرة فعليًا في Louay Phone، اطّلع على المواصفات والسعر الحالي ثم أرسل طلبك مباشرة.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Louay Phone | هواتف وأسعار حقيقية في سوريا',
    description: 'اختيار واضح، بيانات المنتج الحقيقية، وطلب مباشر.',
    type: 'website',
  },
};

export default async function HomePage() {
  const admin = createAdminClient() as any;
  const [productsResult, productCountResult, reviewResult, brandCountResult, exchangeRateResult] = await Promise.all([
    admin
      .from('products')
      .select('id,name,slug,model,price_usd,price_syp,stock_status,installment_enabled,brands(name),product_images(url,alt_text,is_primary,position)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('reviews').select('rating', { count: 'exact' }).eq('is_approved', true),
    admin.from('brands').select('id', { count: 'exact', head: true }),
    admin.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
  ]);

  const ratings = (reviewResult.data ?? []).map((row: any) => Number(row.rating)).filter((value: number) => value >= 1 && value <= 5);
  const avgRating = ratings.length ? ratings.reduce((sum: number, value: number) => sum + value, 0) / ratings.length : 0;
  const products = (productsResult.data ?? []).map((product: any) => ({
    ...product,
    product_images: [...(product.product_images ?? [])].sort((a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0)),
  }));

  return (
    <HomeStorefront
      data={{
        products,
        productCount: productCountResult.count ?? 0,
        reviewCount: reviewResult.count ?? 0,
        avgRating,
        brandCount: brandCountResult.count ?? 0,
        exchangeRate: exchangeRateResult.data?.value ?? null,
      }}
    />
  );
}

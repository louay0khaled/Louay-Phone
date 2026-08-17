import type { Metadata } from 'next';
import HomeStorefront from '@/components/store/HomeStorefront';
import { getCachedHomeData } from '@/lib/storefront-cache';

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
  const data = await getCachedHomeData();
  return <HomeStorefront data={data} />;
}

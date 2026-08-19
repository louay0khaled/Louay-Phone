import type { Metadata } from 'next';
import './globals.css';
import PWARegister from '@/app/components/PWARegister';

const siteUrl = 'https://louay-phone.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Louay Phone | الهواتف الذكية', template: '%s | Louay Phone' },
  description: 'متجر Louay Phone للهواتف الذكية: منتجات حقيقية، أسعار واضحة، صور، مواصفات، وتواصل مباشر للطلب.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'ar_AR', url: siteUrl, siteName: 'Louay Phone', title: 'Louay Phone | الهواتف الذكية', description: 'تصفح الهواتف والأسعار والمواصفات ضمن تجربة شراء سريعة وواضحة.' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><PWARegister />{children}</body></html>;
}

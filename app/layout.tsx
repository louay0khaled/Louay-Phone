import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://louay-phone.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Louay Phone | الهواتف الذكية', template: '%s | Louay Phone' },
  description: 'متجر Louay Phone للهواتف الذكية: منتجات حقيقية، أسعار واضحة، صور، مواصفات، وتواصل مباشر للطلب.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'ar_AR', url: siteUrl, siteName: 'Louay Phone', title: 'Louay Phone | الهواتف الذكية', description: 'تصفح الهواتف والأسعار والمواصفات ضمن تجربة شراء سريعة وواضحة.', images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Louay Phone' }] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}

import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './site.css';
import ChatGate from '@/components/store/ChatGate';
import InstallAppPrompt from '@/components/store/InstallAppPrompt';
import ServiceWorkerRegister from '@/components/store/ServiceWorkerRegister';
import { getSiteAssets } from '@/lib/site-config';

export const revalidate = 3600;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://louay-phone.vercel.app'),
  title: { default: 'Louay Phone | هواتف وأسعار في سوريا', template: '%s | Louay Phone' },
  description: 'Louay Phone — متجر هواتف ذكية يعرض المنتجات المتوفرة ومواصفاتها وأسعارها الحالية مع طلب مباشر ودعم سريع.',
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  applicationName: 'Louay Phone',
  appleWebApp: { capable: true, title: 'Louay Phone', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: true },
  openGraph: { type: 'website', locale: 'ar_SY', siteName: 'Louay Phone', title: 'Louay Phone | هواتف وأسعار في سوريا', description: 'تصفّح المنتجات المتوفرة فعليًا واطلب مباشرة من صفحة المنتج.' },
  twitter: { card: 'summary_large_image', title: 'Louay Phone | هواتف وأسعار في سوريا', description: 'منتجات حقيقية، مواصفات واضحة، وطلب مباشر.' },
};

function fontFormat(url: string) {
  return url.toLowerCase().split('?')[0].endsWith('.otf') ? 'opentype' : 'truetype';
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const assets = await getSiteAssets();
  const regular = assets.fontRegular;
  const bold = assets.fontBold;
  const regularSrc = regular ? `/api/site-font?weight=regular&v=${regular.version}` : '';
  const boldSrc = bold ? `/api/site-font?weight=bold&v=${bold.version}` : '';
  const regularFormat = fontFormat(regular?.url || bold?.url || '');
  const boldFormat = fontFormat(bold?.url || '');

  return (
    <html lang="ar" dir="rtl">
      <head>
        {regularSrc && (
          <style dangerouslySetInnerHTML={{ __html: `@font-face{font-family:'LouayCustom';src:url('${regularSrc}') format('${regularFormat}');font-style:normal;font-weight:400 600;font-display:swap}` }} />
        )}
        {boldSrc && (
          <style dangerouslySetInnerHTML={{ __html: `@font-face{font-family:'LouayCustom';src:url('${boldSrc}') format('${boldFormat}');font-style:normal;font-weight:700 900;font-display:swap}` }} />
        )}
      </head>
      <body style={{ fontFamily: "'LouayCustom', Arial, Tahoma, sans-serif" }}>
        {children}
        <ServiceWorkerRegister />
        <InstallAppPrompt />
        <ChatGate />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

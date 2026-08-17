import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './site.css';
import ChatGate from '@/components/store/ChatGate';
import ServiceWorkerRegister from '@/components/store/ServiceWorkerRegister';
import { getSiteAssets } from '@/lib/site-config';

export const revalidate = 3600;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://louay-phone.vercel.app'),
  title: { default: 'Louay Phone | هواتف وأسعار في سوريا', template: '%s | Louay Phone' },
  description: 'Louay Phone — متجر هواتف ذكية يعرض المنتجات المتوفرة ومواصفاتها وأسعارها الحالية مع طلب مباشر ودعم سريع.',
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  openGraph: { type: 'website', locale: 'ar_SY', siteName: 'Louay Phone', title: 'Louay Phone | هواتف وأسعار في سوريا', description: 'تصفّح المنتجات المتوفرة فعليًا واطلب مباشرة من صفحة المنتج.' },
  twitter: { card: 'summary_large_image', title: 'Louay Phone | هواتف وأسعار في سوريا', description: 'منتجات حقيقية، مواصفات واضحة، وطلب مباشر.' },
};

function fontFormat(url: string) { return url.toLowerCase().split('?')[0].endsWith('.otf') ? 'opentype' : 'truetype'; }

const criticalStorefrontCss = `
[data-storefront]{min-height:100vh;box-sizing:border-box;background:#020617;color:#f8fafc;font-family:Arial,Tahoma,sans-serif;direction:rtl;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
[data-storefront] *{box-sizing:border-box}
[data-storefront] a{color:inherit;text-decoration:none}
[data-storefront] button{font:inherit}
[data-storefront] img{max-width:100%;display:block}
[data-storefront].storefront-home,.storefront-catalog,.storefront-product{background:#020617;color:#f8fafc}
[data-storefront] header{position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(125,211,252,.14);background:rgba(2,6,23,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
[data-storefront] header>div{max-width:1280px;margin:0 auto;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}
[data-storefront] header nav{display:flex;align-items:center;gap:26px;color:#94a3b8;font-size:14px;font-weight:700}
[data-storefront] header nav button{background:none;border:0;color:inherit;cursor:pointer}
[data-storefront] section{max-width:1280px;margin:0 auto;padding:56px 18px}
[data-storefront] .glass{background:linear-gradient(145deg,rgba(15,23,42,.9),rgba(2,6,23,.84));border:1px solid rgba(125,211,252,.16);border-radius:24px;box-shadow:0 24px 90px rgba(0,0,0,.3)}
[data-storefront] .luxury-card{border:1px solid rgba(125,211,252,.15);border-radius:24px;background:linear-gradient(145deg,#0b1424,#030a16);box-shadow:0 24px 90px rgba(0,0,0,.3);overflow:hidden;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
[data-storefront] .luxury-card:hover{transform:translateY(-5px);border-color:rgba(125,211,252,.34);box-shadow:0 32px 105px rgba(0,0,0,.42),0 0 40px rgba(14,165,233,.08)}
[data-storefront] .luxury-button,[data-storefront] .luxury-button-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;border-radius:14px;padding:10px 18px;font-weight:800;cursor:pointer}
[data-storefront] .luxury-button{color:#00131c;border:1px solid rgba(186,230,253,.3);background:linear-gradient(135deg,#67d5ff,#38bdf8 45%,#0ea5e9);box-shadow:0 16px 44px rgba(14,165,233,.2)}
[data-storefront] .luxury-button-secondary{color:#e0f2fe;border:1px solid rgba(125,211,252,.28);background:rgba(15,23,42,.75)}
[data-storefront] .luxury-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;border:1px solid rgba(125,211,252,.22);background:rgba(14,165,233,.09);color:#bae6fd;font-size:12px;font-weight:800}
[data-storefront] .luxury-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(125,211,252,.34),transparent)}
[data-storefront] .product-media,[data-storefront] .product-visual{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 35%,rgba(56,189,248,.13),transparent 43%),linear-gradient(145deg,#0b1424,#030913 72%,#020617);isolation:isolate}
[data-storefront] .product-media img,[data-storefront] .product-visual img{background:transparent!important;object-fit:contain}
@media(max-width:1000px){[data-storefront].storefront-home>section:first-of-type,[data-storefront].storefront-product>section:first-of-type{grid-template-columns:1fr}.storefront-home>section:first-of-type>div:last-child{order:2}.storefront-catalog .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){[data-storefront] header>div{padding:11px 14px}[data-storefront] header nav{display:none}[data-storefront] section{padding:44px 14px}.storefront-product .product-visual img{padding:24px}}
`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const assets = await getSiteAssets();
  const regular = assets.fontRegular; const bold = assets.fontBold;
  const regularSrc = regular ? `/api/site-font?weight=regular&v=${regular.version}` : '';
  const boldSrc = bold ? `/api/site-font?weight=bold&v=${bold.version}` : '';
  const fallbackSrc = regularSrc || boldSrc;
  const fontCss = fallbackSrc ? `@font-face{font-family:'LouayCustom';src:url('${fallbackSrc}') format('${fontFormat(regular?.url || bold?.url || '')}');font-style:normal;font-weight:400 600;font-display:swap}${boldSrc ? `@font-face{font-family:'LouayCustom';src:url('${boldSrc}') format('${fontFormat(bold?.url || '')}');font-style:normal;font-weight:700 900;font-display:swap}` : ''}:root{--site-font:'LouayCustom',Arial,Tahoma,sans-serif}html,body,body *{font-family:var(--site-font)!important}button,input,textarea,select,optgroup,option{font-family:var(--site-font)!important}::placeholder{font-family:var(--site-font)!important}` : '';
  return <html lang="ar" dir="rtl"><head>{fontCss && <style id="site-fonts" dangerouslySetInnerHTML={{ __html: fontCss }} />}<style id="storefront-critical" dangerouslySetInnerHTML={{ __html: criticalStorefrontCss }} /></head><body>{children}<ServiceWorkerRegister /><ChatGate /><Analytics /><SpeedInsights /></body></html>;
}

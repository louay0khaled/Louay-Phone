import type { Metadata } from 'next';
import './site.css';
import ChatWidget from '@/components/store/ChatWidget';
import { getSiteAssets } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Louay Phone | هواتف فاخرة',
  description: 'Louay Phone — متجر إلكتروني احترافي للهواتف الذكية.',
};

function fontFormat(url: string) {
  return url.toLowerCase().split('?')[0].endsWith('.otf') ? 'opentype' : 'truetype';
}

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
[data-storefront].storefront-home>section:first-of-type{display:grid;grid-template-columns:1.08fr .92fr;gap:50px;align-items:center;min-height:calc(100dvh - 72px);padding-top:70px;padding-bottom:70px}
[data-storefront].storefront-home h1{margin:24px 0 0;font-size:clamp(44px,6vw,84px);line-height:1.12;letter-spacing:-.04em;font-weight:900}
[data-storefront].storefront-home>section:first-of-type>div:last-child{width:100%;max-width:540px;margin:auto}
[data-storefront].storefront-home>section:first-of-type .product-media{min-height:540px;border-radius:24px;display:flex;align-items:center;justify-content:center}
[data-storefront].storefront-home #features>div:last-child{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
[data-storefront].storefront-home #features article{padding:28px}
[data-storefront].storefront-home #products>div:last-child{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
[data-storefront].storefront-home #products .product-media{aspect-ratio:1/1.1}
[data-storefront].storefront-catalog .brand-rail{position:sticky;top:72px;z-index:50;margin:0 0 42px;overflow-x:auto;scrollbar-width:none}
[data-storefront].storefront-catalog .brand-rail::-webkit-scrollbar{display:none}
[data-storefront].storefront-catalog .brand-rail__inner{display:flex;gap:8px;min-width:max-content;padding:8px;border:1px solid rgba(125,211,252,.14);border-radius:20px;background:rgba(2,6,23,.9)}
[data-storefront].storefront-catalog .brand-tab{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:9px 14px;border:0;border-radius:14px;background:transparent;color:#94a3b8;font-weight:800;white-space:nowrap;cursor:pointer}
[data-storefront].storefront-catalog .brand-tab.is-active{color:#00131c;background:linear-gradient(135deg,#b6ecff,#67d5ff 45%,#38bdf8);box-shadow:0 10px 30px rgba(14,165,233,.2)}
[data-storefront].storefront-catalog .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
[data-storefront].storefront-catalog .product-media{aspect-ratio:1/1}
[data-storefront].storefront-product>section:first-of-type{display:grid;grid-template-columns:1.02fr .98fr;gap:48px;align-items:start;padding-top:38px}
[data-storefront].storefront-product .product-visual{aspect-ratio:1/1;border-radius:30px;border:1px solid rgba(125,211,252,.14);display:flex;align-items:center;justify-content:center}
[data-storefront].storefront-product .product-visual img{width:100%;height:100%;padding:48px}
[data-storefront].storefront-product h1{font-size:clamp(36px,5vw,62px);line-height:1.1;font-weight:900;letter-spacing:-.04em}
[data-storefront].storefront-product .glass{padding:22px}
@media(max-width:1000px){[data-storefront].storefront-home>section:first-of-type,[data-storefront].storefront-product>section:first-of-type{grid-template-columns:1fr}.storefront-home>section:first-of-type>div:last-child{order:2}.storefront-home #products>div:last-child,.storefront-catalog .grid{grid-template-columns:repeat(2,minmax(0,1fr))}.storefront-home #features>div:last-child{grid-template-columns:1fr}}
@media(max-width:640px){[data-storefront] header>div{padding:11px 14px}[data-storefront] header nav{display:none}[data-storefront] section{padding:44px 14px}.storefront-home>section:first-of-type{min-height:auto;padding-top:44px}.storefront-home h1{font-size:44px}.storefront-home>section:first-of-type .product-media{min-height:360px}.storefront-home #products>div:last-child,.storefront-catalog .grid{grid-template-columns:1fr 1fr;gap:12px}.storefront-catalog .brand-rail{top:62px;margin-bottom:24px}.storefront-catalog .brand-tab{min-height:40px;padding:8px 11px;font-size:12px}.storefront-product .product-visual img{padding:24px}}
`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const assets = await getSiteAssets();
  const regular = assets.fontRegular?.url;
  const bold = assets.fontBold?.url;
  const regularUrl = regular ? `${regular}${regular.includes('?') ? '&' : '?'}v=${assets.fontRegular?.version ?? Date.now()}` : '';
  const boldUrl = bold ? `${bold}${bold.includes('?') ? '&' : '?'}v=${assets.fontBold?.version ?? Date.now()}` : '';
  const fontCss = regular || bold ? `
@font-face{font-family:'LouayCustom';src:url('${regularUrl || boldUrl}') format('${fontFormat(regularUrl || boldUrl)}');font-style:normal;font-weight:400 600;font-display:swap}
${boldUrl ? `@font-face{font-family:'LouayCustom';src:url('${boldUrl}') format('${fontFormat(boldUrl)}');font-style:normal;font-weight:700 900;font-display:swap}` : ''}
:root{--site-font:'LouayCustom',Arial,Tahoma,sans-serif}
html,body,body *{font-family:var(--site-font)!important}
button,input,textarea,select,optgroup,option{font-family:var(--site-font)!important}
::placeholder{font-family:var(--site-font)!important}
` : '';

  return <html lang="ar" dir="rtl"><head>{fontCss && <style id="site-fonts" dangerouslySetInnerHTML={{ __html: fontCss }} />}<style id="storefront-critical" dangerouslySetInnerHTML={{ __html: criticalStorefrontCss }} /><link rel="stylesheet" href="/storefront-fallback.css?v=5" /></head><body>{children}<ChatWidget /></body></html>;
}

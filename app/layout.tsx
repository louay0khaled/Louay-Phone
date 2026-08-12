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
  return url.toLowerCase().includes('.otf') ? 'opentype' : 'truetype';
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const assets = await getSiteAssets();
  const regular = assets.fontRegular?.url;
  const bold = assets.fontBold?.url;
  const fontCss = [
    regular ? `@font-face{font-family:'LouayCustom';src:url('${regular}') format('${fontFormat(regular)}');font-style:normal;font-weight:400 600;font-display:swap}` : '',
    bold ? `@font-face{font-family:'LouayCustom';src:url('${bold}') format('${fontFormat(bold)}');font-style:normal;font-weight:700 900;font-display:swap}` : '',
    regular || bold ? `:root{--site-font:'LouayCustom',Arial,Tahoma,sans-serif}body,button,input,textarea,select{font-family:var(--site-font)}` : '',
  ].join('');

  return <html lang="ar" dir="rtl"><head>{fontCss && <style dangerouslySetInnerHTML={{ __html: fontCss }} />}</head><body>{children}<ChatWidget /></body></html>;
}

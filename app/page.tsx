import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Script from 'next/script';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Louay Phone | عالم الهواتف الذكية',
  description: 'Louay Phone - متجر متخصص في أحدث الهواتف الذكية والإكسسوارات الأصلية بأفضل الأسعار وتجربة شراء استثنائية.',
};

function readHomepage() {
  const filePath = path.join(process.cwd(), 'public', 'home.html');
  const source = fs.readFileSync(filePath, 'utf8');
  const headMatch = source.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const head = headMatch?.[1] ?? '';
  let body = bodyMatch?.[1] ?? source;
  body = body.replace(/<script[^>]+src=["']\/home-runtime\.js[^>]*><\/script>/gi, '');
  const links = (head.match(/<link\b[^>]*>/gi) ?? []).join('');
  const styles = (head.match(/<style[\s\S]*?<\/style>/gi) ?? []).join('');
  return { links, styles, body };
}

export default function HomePage() {
  const homepage = readHomepage();
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: homepage.links + homepage.styles }} suppressHydrationWarning />
      <div dangerouslySetInnerHTML={{ __html: homepage.body }} suppressHydrationWarning />
      <Script src="/home-runtime.js?v=3" strategy="afterInteractive" />
    </>
  );
}

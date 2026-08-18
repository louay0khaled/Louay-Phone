type Candidate = { name: string; pageUrl: string; imageUrl: string; source: 'GSMArena' };

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(value: string, base = 'https://www.gsmarena.com/') {
  try {
    return new URL(value, base).toString();
  } catch {
    return '';
  }
}

export async function discoverProductImages(query: string): Promise<Candidate[]> {
  const searchUrl = `https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/1.0)' },
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const html = await response.text();
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+\.php)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: absoluteUrl(match[1]), name: stripHtml(match[2]) }))
    .filter((item) => item.href.includes('gsmarena.com/') && item.name);

  const unique = new Map<string, { href: string; name: string }>();
  for (const link of links) {
    if (!unique.has(link.href)) unique.set(link.href, { href: link.href, name: link.name });
  }

  const candidates: Candidate[] = [];
  for (const item of [...unique.values()].slice(0, 6)) {
    try {
      const page = await fetch(item.href, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/1.0)' }, cache: 'no-store' });
      if (!page.ok) continue;
      const pageHtml = await page.text();
      const og = pageHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || pageHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (!og?.[1]) continue;
      const imageUrl = absoluteUrl(og[1], item.href);
      if (!imageUrl) continue;
      candidates.push({ name: item.name, pageUrl: item.href, imageUrl, source: 'GSMArena' });
    } catch {
      // Ignore a single candidate failure and continue.
    }
  }
  return candidates;
}

export function buildProductSearchQuery(brand: string | null | undefined, name: string, model: string | null | undefined) {
  return [brand, name, model && model !== '-' ? model : null].filter(Boolean).join(' ').trim();
}

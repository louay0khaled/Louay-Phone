type Candidate = { name: string; pageUrl: string; imageUrl: string; source: 'GSMArena' };

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(value: string, base = 'https://www.gsmarena.com/') {
  try { return new URL(value, base).toString(); } catch { return ''; }
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[+_–—-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string) {
  return normalize(value).split(' ').filter((token) => token.length >= 2);
}

function scoreMatch(query: string, candidateName: string) {
  const wanted = tokens(query);
  const got = new Set(tokens(candidateName));
  if (!wanted.length) return 0;
  let matched = 0;
  for (const token of wanted) if (got.has(token)) matched += 1;
  const exact = normalize(query) === normalize(candidateName) ? 100 : 0;
  return exact + matched / wanted.length;
}

function extractImageFromPhonePage(html: string, pageUrl: string) {
  const block = html.match(/<[^>]+class=["'][^"']*specs-photo-main[^"']*["'][^>]*>[\s\S]{0,8000}/i)?.[0] ?? '';
  const target = block || html;

  const attrs = [
    /\bdata-src=["']([^"']+)["']/i,
    /\bsrc=["']([^"']+)["']/i,
    /\bsrcset=["']([^"']+)["']/i,
  ];

  for (const pattern of attrs) {
    const match = target.match(pattern);
    if (!match?.[1]) continue;
    const value = match[1].split(',')[0].trim().split(/\s+/)[0];
    const url = absoluteUrl(value, pageUrl);
    if (url) return url;
  }

  const og = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
  return og?.[1] ? absoluteUrl(og[1], pageUrl) : '';
}

const REQUEST_TIMEOUT = 9000;

export async function discoverProductImages(query: string): Promise<Candidate[]> {
  const searchUrl = `https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/2.0)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  if (!response.ok) return [];

  const html = await response.text();
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+\.php(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: absoluteUrl(match[1]), name: stripHtml(match[2]) }))
    .filter((item) => item.href.includes('gsmarena.com/') && item.name);

  const unique = new Map<string, { href: string; name: string }>();
  for (const link of links) if (!unique.has(link.href)) unique.set(link.href, link);

  const ranked = [...unique.values()]
    .map((item) => ({ ...item, score: scoreMatch(query, item.name) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const candidates: Candidate[] = [];
  for (const item of ranked) {
    try {
      const page = await fetch(item.href, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/2.0)',
          accept: 'text/html,application/xhtml+xml',
        },
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      if (!page.ok) continue;
      const pageHtml = await page.text();
      const imageUrl = extractImageFromPhonePage(pageHtml, item.href);
      if (!imageUrl) continue;

      let parsed: URL;
      try { parsed = new URL(imageUrl); } catch { continue; }
      if (!/^fdn\d*\.gsmarena\.com$/i.test(parsed.hostname)) continue;

      candidates.push({ name: item.name, pageUrl: item.href, imageUrl, source: 'GSMArena' });
      if (candidates.length >= 4) break;
    } catch {
      // Ignore one candidate and continue searching.
    }
  }

  return candidates;
}

export function buildProductSearchQuery(brand: string | null | undefined, name: string, model: string | null | undefined) {
  return [brand, name, model && model !== '-' ? model : null].filter(Boolean).join(' ').trim();
}

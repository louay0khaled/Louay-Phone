type Candidate = { name: string; pageUrl: string; imageUrl: string; source: 'GSMArena'; confidence: number; matchedQuery: string };

type SearchHit = { href: string; name: string; imageUrl?: string; query: string };

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(value: string, base = 'https://www.gsmarena.com/') {
  try { return new URL(value, base).toString(); } catch { return ''; }
}

const STOP_WORDS = new Set([
  'phone', 'mobile', 'smartphone', 'smart', 'device', 'global', 'edition', 'version',
  'dual', 'sim', '5g', '4g', 'lte', 'nfc', 'official', 'new', '2026', '2025', '2024',
]);

const MODEL_ALIASES: Record<string, string[]> = {
  galaxy: ['samsung galaxy', 'galaxy'],
  redmi: ['xiaomi redmi', 'redmi'],
  poco: ['xiaomi poco', 'poco'],
  honor: ['honor'],
  magic: ['honor magic'],
  magicbook: ['honor magicbook'],
  realme: ['realme'],
  oppo: ['oppo'],
  vivo: ['vivo'],
  iqoo: ['iqoo', 'vivo iqoo'],
  oneplus: ['oneplus', 'one plus'],
  nothing: ['nothing'],
  pixel: ['google pixel', 'pixel'],
  iphone: ['apple iphone', 'iphone'],
  ipad: ['apple ipad', 'ipad'],
  mate: ['huawei mate', 'mate'],
  p: ['huawei p', 'p'],
  nova: ['huawei nova', 'nova'],
  gt: ['realme gt', 'gt'],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[‐‑‒–—―]+/g, '-')
    .replace(/[+_]+/g, ' ')
    .replace(/['’`]/g, '')
    .replace(/\b(12|16|24)\s*gb\s*(ram)?\b/gi, ' ')
    .replace(/\b(128|256|512|1024)\s*gb\b/gi, ' ')
    .replace(/\b(1|2)\s*tb\b/gi, ' ')
    .replace(/\bdual\s*(sim|camera)\b/gi, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .replace(/[.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function meaningfulTokens(value: string) {
  return normalize(value).split(' ').filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function modelCore(value: string) {
  const raw = normalize(value);
  return raw
    .replace(/\b(plus|max|ultra|pro|maxs|prime|play|lite|neo|se|fe|a\+|note)\b/gi, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j < curr.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

function tokenSimilarity(a: string, b: string) {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length, 1);
}

function scoreMatch(query: string, candidateName: string, brand?: string | null, rawName?: string, rawModel?: string | null) {
  const q = normalize(query);
  const c = normalize(candidateName);
  const wanted = meaningfulTokens(q);
  const got = meaningfulTokens(c);
  if (!wanted.length || !got.length) return 0;

  let tokenScore = 0;
  let matched = 0;
  for (const token of wanted) {
    const best = Math.max(...got.map((candidate) => tokenSimilarity(token, candidate)));
    tokenScore += best;
    if (best >= 0.82) matched += 1;
  }
  tokenScore /= wanted.length;

  const exact = q === c ? 1 : 0;
  const includes = c.includes(q) || q.includes(c) ? 1 : 0;
  const sequence = got.join(' ').includes(wanted.join(' ')) ? 1 : 0;
  let score = tokenScore * 0.62 + exact * 0.22 + includes * 0.08 + sequence * 0.08;

  const low = c;
  const sourceName = normalize(`${brand ?? ''} ${rawName ?? ''} ${rawModel ?? ''}`);
  const variants = ['ultra', 'plus', 'pro', 'max', 'lite', 'neo', 'se', 'fe'];
  for (const variant of variants) {
    const wantedHas = sourceName.includes(` ${variant}`) || sourceName.endsWith(variant);
    const gotHas = low.includes(` ${variant}`) || low.endsWith(variant);
    if (wantedHas !== gotHas) score -= wantedHas ? 0.30 : 0.10;
  }
  if (matched < Math.max(1, Math.ceil(wanted.length * 0.55))) score -= 0.35;
  return Math.max(0, Math.min(1, score));
}

function buildSearchVariants(brand: string | null | undefined, name: string, model: string | null | undefined) {
  const raw = [brand, name, model && model !== '-' ? model : null].filter(Boolean).join(' ').trim();
  const cleaned = normalize(raw);
  const withoutStorage = cleaned.replace(/\b\d+\s*(gb|tb)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const variants = new Set<string>();
  const add = (value: string) => { const q = value.trim(); if (q.length >= 3) variants.add(q); };
  add(cleaned);
  add(withoutStorage);
  add(modelCore(withoutStorage));

  const lower = cleaned;
  for (const [key, aliases] of Object.entries(MODEL_ALIASES)) {
    if (!lower.includes(key)) continue;
    const core = modelCore(withoutStorage.replace(new RegExp(`\\b${key}\\b`, 'gi'), ' ').trim());
    for (const alias of aliases) {
      add(`${alias} ${core}`);
      add(`${alias.replace('xiaomi ', '').replace('samsung ', '').replace('apple ', '')} ${core}`);
    }
  }

  const brandOnly = normalize(String(brand ?? ''));
  if (brandOnly) add(`${brandOnly} ${modelCore(name)}`);
  add(modelCore(name));
  if (model) add(modelCore(model));

  return [...variants].slice(0, 10);
}

function extractImageFromAnchor(anchorHtml: string, pageUrl: string) {
  const img = anchorHtml.match(/<img[^>]+(?:data-src|data-original|src)=["']([^"']+)["'][^>]*>/i);
  if (!img?.[1]) return '';
  const src = img[1].split(',')[0].trim().split(/\s+/)[0];
  return absoluteUrl(src, pageUrl);
}

function extractImageFromPhonePage(html: string, pageUrl: string) {
  const block = html.match(/<[^>]+class=["'][^"']*specs-photo-main[^"']*["'][^>]*>[\s\S]{0,12000}/i)?.[0] ?? '';
  const target = block || html;
  const attrs = [
    /\bdata-src=["']([^"']+)["']/i,
    /\bdata-original=["']([^"']+)["']/i,
    /\bsrc=["']([^"']+)["']/i,
    /\bsrcset=["']([^"']+)["']/i,
  ];
  for (const pattern of attrs) {
    const match = target.match(pattern);
    if (!match?.[1]) continue;
    const value = match[1].split(',').slice(-1)[0].trim().split(/\s+/)[0];
    const url = absoluteUrl(value, pageUrl);
    if (url) return url;
  }
  const og = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
  return og?.[1] ? absoluteUrl(og[1], pageUrl) : '';
}

function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);
    return /^(fdn\\d*|fdn)\.gsmarena\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

async function searchGsmArena(query: string): Promise<SearchHit[]> {
  const searchUrl = `https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/3.0)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) return [];
  const html = await response.text();

  const hits: SearchHit[] = [];
  const linkPattern = /<a[^>]+href=["']([^"']+\.php(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const href = absoluteUrl(match[1]);
    const name = stripHtml(match[2]);
    if (!href || !name || !/gsmarena\.com\//i.test(href)) continue;
    const imageUrl = extractImageFromAnchor(match[2], href);
    hits.push({ href, name, imageUrl, query });
  }

  const unique = new Map<string, SearchHit>();
  for (const hit of hits) {
    if (!unique.has(hit.href)) unique.set(hit.href, hit);
  }
  return [...unique.values()].slice(0, 12);
}

async function fetchPageImage(hit: SearchHit) {
  if (isAllowedImageUrl(hit.imageUrl ?? '')) return hit.imageUrl!;
  try {
    const page = await fetch(hit.href, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; LouayPhoneImageBot/3.0)',
        accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
    });
    if (!page.ok) return '';
    const html = await page.text();
    const imageUrl = extractImageFromPhonePage(html, hit.href);
    return isAllowedImageUrl(imageUrl) ? imageUrl : '';
  } catch {
    return '';
  }
}

export async function discoverProductImages(query: string, context?: { brand?: string | null; name?: string; model?: string | null }) {
  const variants = buildSearchVariants(context?.brand, context?.name ?? query, context?.model);
  const grouped = new Map<string, SearchHit>();

  for (const variant of variants) {
    try {
      const hits = await searchGsmArena(variant);
      for (const hit of hits) {
        const key = hit.href;
        const current = grouped.get(key);
        if (!current) grouped.set(key, hit);
        else if (!current.imageUrl && hit.imageUrl) grouped.set(key, hit);
      }
    } catch {
      // Continue with the next search variant.
    }
  }

  const ranked = [...grouped.values()]
    .map((hit) => ({ ...hit, score: scoreMatch(query, hit.name, context?.brand, context?.name, context?.model) }))
    .filter((hit) => hit.score >= 0.42)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const candidates: Candidate[] = [];
  for (const item of ranked) {
    const imageUrl = await fetchPageImage(item);
    if (!imageUrl) continue;
    candidates.push({
      name: item.name,
      pageUrl: item.href,
      imageUrl,
      source: 'GSMArena',
      confidence: Number(item.score.toFixed(3)),
      matchedQuery: item.query,
    });
    if (candidates.length >= 6) break;
  }

  return candidates;
}

export function buildProductSearchQuery(brand: string | null | undefined, name: string, model: string | null | undefined) {
  return [brand, name, model && model !== '-' ? model : null].filter(Boolean).join(' ').trim();
}

export function buildProductSearchVariants(brand: string | null | undefined, name: string, model: string | null | undefined) {
  return buildSearchVariants(brand, name, model);
}

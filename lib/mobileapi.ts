type MobileApiDevice = Record<string, unknown>;

type NormalizedDevice = {
  id?: string;
  name: string;
  brand?: string;
  imageUrls: string[];
  imageDataUrls: string[];
  specs: Record<string, unknown>;
  raw: MobileApiDevice;
};

const API_BASE = 'https://api.mobileapi.dev';

function getKey() {
  const key = process.env.MOBILEAPI_API_KEY;
  if (!key) throw new Error('MOBILEAPI_API_KEY غير مضبوط في بيئة الخادم.');
  return key;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function flattenImages(value: unknown): { urls: string[]; dataUrls: string[] } {
  const urls: string[] = [];
  const dataUrls: string[] = [];
  const visit = (item: unknown) => {
    if (typeof item === 'string') {
      if (/^data:image\//i.test(item)) dataUrls.push(item);
      else if (/^https?:\/\//i.test(item)) urls.push(item);
      return;
    }
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    const obj = asRecord(item);
    if (!obj) return;
    for (const key of ['url', 'image', 'src', 'thumbnail', 'original', 'base64', 'data']) {
      if (key in obj) visit(obj[key]);
    }
  };
  visit(value);
  return { urls: [...new Set(urls)], dataUrls: [...new Set(dataUrls)] };
}

function collectSpecs(device: MobileApiDevice) {
  const excluded = new Set(['images', 'image', 'thumbnail', 'brand_name', 'brand', 'name', 'id', 'slug']);
  const specs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(device)) {
    if (excluded.has(key) || value == null || value === '') continue;
    if (typeof value === 'object') specs[key] = value;
    else specs[key] = value;
  }
  return specs;
}

function scoreDevice(query: string, device: MobileApiDevice) {
  const target = `${device.brand_name ?? device.brand ?? ''} ${device.name ?? ''}`.toLowerCase();
  const wanted = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const got = new Set(target.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/));
  if (!wanted.length) return 0;
  let hit = 0;
  for (const token of wanted) if (got.has(token)) hit += 1;
  return hit / wanted.length + (target.includes(query.toLowerCase()) ? 1 : 0);
}

export async function searchMobileApi(query: string): Promise<NormalizedDevice[]> {
  const key = getKey();
  const url = new URL(`${API_BASE}/devices/search`);
  url.searchParams.set('name', query);
  const response = await fetch(url, {
    headers: {
      'x-api-key': key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`MobileAPI search failed (${response.status}).`);
  const payload = await response.json() as unknown;
  const root = asRecord(payload);
  const rawDevices = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.devices)
      ? root.devices
      : Array.isArray(root?.data)
        ? root.data
        : root?.device
          ? [root.device]
          : root
            ? [root]
            : [];

  return rawDevices
    .map(asRecord)
    .filter((device): device is Record<string, unknown> => Boolean(device))
    .map((device) => {
      const images = flattenImages(device.images ?? device.image ?? device.media);
      return {
        id: typeof device.id === 'string' ? device.id : typeof device.slug === 'string' ? device.slug : undefined,
        name: String(device.name ?? 'Unknown device'),
        brand: String(device.brand_name ?? device.brand ?? ''),
        imageUrls: images.urls,
        imageDataUrls: images.dataUrls,
        specs: collectSpecs(device),
        raw: device,
      } satisfies NormalizedDevice;
    })
    .sort((a, b) => scoreDevice(query, b.raw) - scoreDevice(query, a.raw));
}

export function buildMobileApiQuery(brand: string | null | undefined, name: string, model?: string | null) {
  const cleaned = [brand, name, model && model !== '-' ? model : null].filter(Boolean).join(' ');
  return cleaned
    .replace(/\b(\d+\s*(GB|TB)|\d+\/\d+|Dual\s*SIM|5G|4G|LTE|NFC)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

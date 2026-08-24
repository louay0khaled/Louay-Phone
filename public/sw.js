const CACHE = 'louay-phone-shell-v4';
const CORE = ['/icon.svg', '/manifest.webmanifest'];
const MAX_RUNTIME_ENTRIES = 80;

const offlinePage = () => new Response(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111113"><title>Louay Phone</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f7;color:#111113;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif}.card{width:min(420px,calc(100% - 40px));padding:32px;border-radius:28px;background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 20px 70px rgba(0,0,0,.08);text-align:center}.icon{font-size:38px}.muted{color:#6e6e73;line-height:1.7;font-size:14px}</style></head><body><main class="card"><div class="icon">⌁</div><h1>أنت غير متصل حاليًا</h1><p class="muted">الصفحة التي طلبتها غير محفوظة على هذا الجهاز بعد. أعد الاتصال بالإنترنت وحاول مرة أخرى.</p></main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 503 });

async function putBounded(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  const keys = await cache.keys();
  if (keys.length > MAX_RUNTIME_ENTRIES) {
    await Promise.all(keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES).map((key) => cache.delete(key)));
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('louay-phone-shell-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const network = fetch(request).then(async (response) => {
        if (response.ok) await putBounded(CACHE, request, response.clone());
        return response;
      }).catch(() => null);
      return cached || (await network) || offlinePage();
    })());
    return;
  }

  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(caches.match(request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok || response.type === 'opaque') await putBounded(CACHE, request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    }));
    return;
  }

  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) await putBounded(CACHE, request, response.clone());
      return response;
    }).catch(() => caches.match(request)));
  }
});

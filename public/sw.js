const PREFIX = 'el-sanctuario-21-';
const CACHE = PREFIX + 'v3';
const BUILD_ASSETS = []; // Filled by scripts/precache.mjs after the build.
const allowed = url => url.origin === self.location.origin && !url.search && (/^\/(en|es)\/(?:(?:stories|editions|categories)\/[a-z0-9-]+\/|(?:archives|chef-letters)\/)?$/.test(url.pathname) || /^\/(assets|_astro)\/[\w./-]+$/.test(url.pathname) || /^\/media\/[a-f0-9-]{36}$/.test(url.pathname) || url.pathname === '/offline/' || url.pathname === '/');
const publicResponse = response => response.ok && !response.redirected && !/private/i.test(response.headers.get('Cache-Control') || '');
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/en/', '/es/', '/offline/', '/assets/editorial.ttf', '/assets/editorial-italic.ttf', '/assets/sans.ttf', '/assets/icon-192.png', '/assets/hero.jpg', '/assets/infinity.jpg', '/assets/sunset.jpg', ...BUILD_ASSETS])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'SAVE_PUBLIC_URLS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(event.data.urls.slice(0,25).map(async value => {
    if (typeof value !== 'string') return;
    const url = new URL(value,self.location.origin); if (!allowed(url)) return;
    const response = await fetch(url); if (publicResponse(response)) await cache.put(url,response);
  }))));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  // API responses, weather, admin and all writes always use the network.
  if (request.method !== 'GET' || !allowed(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (publicResponse(response)) event.waitUntil(cache.put(request,response.clone()));
      return response;
    } catch {
      const saved = await cache.match(request);
      if (saved) return saved;
      if (url.pathname === '/') {
        const language = request.headers.get('accept-language')?.startsWith('es') ? 'es' : 'en';
        const journal = await cache.match(`/${language}/`); if (journal) return journal;
      }
      if (request.mode === 'navigate') return (await cache.match('/offline/')) || Response.error();
      return Response.error();
    }
  })());
});

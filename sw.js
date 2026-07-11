const CACHE_NAME = 'big2go-v104';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './big2go-casino.css',
  './big2go-casino-fix.css',
  './big2go-casino-fix2.css',
  './big2go-casino-portrait.css',
  './big2go-casino-landscape.css',
  './big2go-premium.css',
  './big2go-final-mobile.css',
  './big2go-app-redesign.css',
  './big2go-cascade-guard.css',
  './big2go-polish-guard.css',
  './big2go-hand-guard.css',
  './big2go-gameplay-clarity.css?v=34',
  './big2go-room.css?v=10',
  './big2go-voice.css?v=4',
  './big2go-rejoin.css?v=3',
  './big2go-coins.css?v=5',
  './big2go-mobile-redesign.css?v=8',
  './big2go-voice-mobile-override.css?v=2',
  './big2go-landing-v3.css?v=13',
  './big2go-gameplay-premium.css?v=14',
  './aiReactions.js?v=3',
  './game.js?v=56',
  './manifest.webmanifest',
  './icon.svg',
  './privacy.html',
  './terms.html',
  './credits.html'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => (key === CACHE_NAME ? null : caches.delete(key)))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    const copy = networkResponse.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    return networkResponse;
  } catch (_) {
    const cached = await caches.match(request);
    return cached || caches.match('./index.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const networkResponse = await fetch(request);
  const copy = networkResponse.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  return networkResponse;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rooms')) return;
  const isPage = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');
  const isFreshAsset = url.pathname.endsWith('/game.js') || url.pathname.endsWith('/sw.js') || url.pathname.endsWith('.css');
  event.respondWith((isPage || isFreshAsset) ? networkFirst(event.request) : cacheFirst(event.request));
});

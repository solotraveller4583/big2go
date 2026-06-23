const CACHE_NAME = 'lucky2-v9';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './lucky2-casino.css',
  './lucky2-casino-fix.css',
  './lucky2-casino-fix2.css',
  './lucky2-casino-portrait.css',
  './lucky2-casino-landscape.css',
  './lucky2-premium.css',
  './lucky2-final-mobile.css',
  './game.js',
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
    caches.keys().then(keys => Promise.all(keys.map(key => (key === CACHE_NAME ? null : caches.delete(key)))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return networkResponse;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

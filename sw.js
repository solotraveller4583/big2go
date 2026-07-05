const CACHE_NAME = 'big2go-v38';
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
  './big2go-gameplay-clarity.css?v=25',
  './big2go-room.css?v=5',
  './game.js?v=32',
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

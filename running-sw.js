// B2P Running Order — Service Worker
// Caches the portal page for offline/install support

const CACHE_NAME = 'b2p-running-order-v1';
const CACHE_URLS = [
  '/runningorderadmin/runningorder.html',
  '/runningorderadmin/android-chrome-192x192.png',
  '/runningorderadmin/android-chrome-512x512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Only cache same-origin requests — let Google Sites load normally
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});

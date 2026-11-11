// B2P Running Order — Service Worker
// Network first: always fetch the latest launcher page, fall back to the
// cached copy only when offline. An old cache-first copy (v1) sent people to
// last comp's site address, so on activate any open launcher is reloaded.

const CACHE_NAME = 'b2p-running-order-v2';
const CACHE_URLS = [
  '/runningorderadmin/runningorder.html',
  '/runningorderadmin/android-chrome-192x192.png',
  '/runningorderadmin/android-chrome-512x512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS.map(function(u) { return new Request(u, { cache: 'reload' }); }));
    }).catch(function() {})
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
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // Reload any launcher that the old worker served from its stale cache
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(c) {
          try { c.navigate(c.url); } catch (err) {}
        });
      });
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Only handle same-origin GET requests; let Google Sites load normally
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(function(res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, copy); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/runningorderadmin/runningorder.html');
      });
    })
  );
});

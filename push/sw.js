// B2P Live Tracker: staff alerts only.
// This worker never stores or serves pages (no fetch handler), so it can
// never leave anyone on an old copy of the app. Its scope is /push/, which
// has no pages in it. It only shows notifications.

const API = 'https://script.google.com/macros/s/AKfycbwREmPTbjTbICoycCjMksAzKQJx9yU7M2Y9QP1z8E8WULTk9iDu4nTVENSjtBper3stOw/exec';
const APP = '/runningorderadmin/';

self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(e) {
  e.waitUntil((async function() {
    let title = 'B2P Running Order';
    let body  = 'Nothing ticked for a while. Tap to check.';
    try {
      const ctrl = new AbortController();
      const t = setTimeout(function() { ctrl.abort(); }, 8000);
      const r = await fetch(API + '?action=pushAlert&t=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      const d = await r.json();
      if (d && d.body) { body = d.body; if (d.title) title = d.title; }
    } catch (err) {}
    await self.registration.showNotification(title, {
      body: body,
      tag: 'b2p-alert',
      renotify: true,
      icon: APP + 'admin-android-chrome-192x192.png',
      data: { url: APP }
    });
  })());
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
    for (const c of list) {
      const u = new URL(c.url);
      if (u.pathname === APP || u.pathname === APP + 'index.html') { if ('focus' in c) return c.focus(); }
    }
    return self.clients.openWindow(APP);
  }));
});

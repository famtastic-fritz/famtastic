// Minimal service worker — makes the PWA installable + caches the shell + Web Push.
// API: never cached. HTML/navigations: network-first (so UI updates show up
// immediately, not trapped behind a stale cache). Icons/manifest: cache-first.
// Bump CACHE whenever the shell changes — activate purges every older cache.
const CACHE = 'shay-v2-companion';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // never cache API
  const isHTML = e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isHTML) {
    // Network-first: always try fresh HTML, fall back to cache offline.
    e.respondWith(
      fetch(e.request)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(()=>{}); return r; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // Static assets (icons, manifest): cache-first.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Web Push — real lock-screen notifications for the installed Android PWA.
self.addEventListener('push', e => {
  let d = { title: 'Shay', body: '', url: '/' };
  try { d = Object.assign(d, e.data.json()); } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: 'icon-192.png', badge: 'icon-192.png',
    data: { url: d.url }, tag: 'shay-arc', renotify: true,
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const u = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(u);
  }));
});

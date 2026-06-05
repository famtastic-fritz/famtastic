/* Shay — Command · service worker
 * App shell is cache-first for instant offline open.
 * state.json is network-first (always try fresh briefing, fall back to cache).
 */
'use strict';

var CACHE = 'shay-command-v1';
var SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // addAll is atomic; ignore individual misses by adding tolerantly
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () { /* tolerate a missing asset */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Network-first for the live briefing snapshot.
  if (url.pathname.endsWith('/state.json') || url.pathname.endsWith('state.json')) {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req);
      })
    );
    return;
  }

  // Cache-first for the app shell (and everything else GET).
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        // opportunistically cache same-origin successful responses
        if (res && res.status === 200 && url.origin === self.location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // offline navigation fallback to the app shell
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

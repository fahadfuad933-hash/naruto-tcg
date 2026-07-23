/* NARUTO TGC — Service Worker: Cache-first für die komplette App (offline).
   Bei Updates CACHE-Version erhöhen, damit alte Caches verworfen werden. */
'use strict';
const CACHE = 'ntcg-v10';
const CORE = [
  './', './index.html', './manifest.json',
  './css/style.css',
  './js/data.js', './js/engine.js', './js/ai.js', './js/audio.js', './js/music.js',
  './js/story.js', './js/duel.js', './js/map.js', './js/shop.js', './js/main.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first, Netz als Fallback (und nachcachen); alle Assets sind gleiche Origin
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});

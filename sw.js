// Service Worker - SiWarga PWA
const CACHE = 'siwarga-v5';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/db.js',
  './js/app.js',
  './js/config.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Network-first for Supabase / API calls
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // Network-first for app shell (HTML/CSS/JS) supaya update cepat keambil
  if (req.destination === 'document' || req.destination === 'script' || req.destination === 'style' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }
  // Cache-first untuk aset lain (icon, dll)
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

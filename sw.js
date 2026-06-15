// Service Worker - LaporPakRT/RW PWA
const CACHE = 'siwarga-v34';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './styles.extra.css',
  './js/config.js',
  './js/instance.js',
  './js/db.js',
  './js/app.js',
  './js/surat.js',
  './js/auth.js',
  './js/settings.js',
  './js/chat.js',
  './js/darurat.js',
  './js/brand.js',
  './js/push.js',
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
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
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

// Pola getar (milidetik): [getar, jeda, getar, ...]
const VIBRATE_NORMAL = [200, 100, 200];
const VIBRATE_DARURAT = [300, 120, 300, 120, 300, 120, 500];

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'LaporPakRT';
  const isDarurat = data.darurat === true || data.tipe === 'darurat' || /darurat|sos/i.test(title);
  // Prioritas: pola dari server (data.vibrate) > pola darurat > pola normal.
  const pattern = Array.isArray(data.vibrate) ? data.vibrate : (isDarurat ? VIBRATE_DARURAT : VIBRATE_NORMAL);
  const opts = {
    body: data.body || 'Ada pembaruan baru di lingkungan Anda.',
    icon: './icons/icon.svg',
    badge: './icons/icon.svg',
    vibrate: pattern,
    tag: data.tag || undefined,
    renotify: data.tag ? true : undefined,
    requireInteraction: isDarurat,
    data: { url: data.url || './' }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

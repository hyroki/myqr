const CACHE_NAME = 'qr-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/js/app.js',
  '/js/jsQR-loader.js',
  'https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(e.request).then(r => {
        return caches.open(CACHE_NAME).then(cache => { cache.put(e.request, r.clone()); return r; });
      }).catch(()=>caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request).then(r => {
      return caches.open(CACHE_NAME).then(cache => { cache.put(e.request, r.clone()); return r; });
    }))
  );
});

/* ============================================================
   sw.js — Service worker: juego disponible sin conexión
   ============================================================ */

const CACHE = 'alef-bet-v7';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/data.js',
  './js/audio.js',
  './js/app.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => { /* algún recurso falló: se serving igual */ })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      // Solo las navegaciones usan index.html como respaldo.
      // Para CSS/JS, un HTML de fallback rompería la app por tipo MIME.
      const fallback = () =>
        req.mode === 'navigate'
          ? caches.match('./index.html')
          : Response.error();

      if (hit) {
        // Revalidación en segundo plano (sin bloquear la respuesta)
        fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy).catch(() => {}));
            }
          })
          .catch(() => { /* sin red: se sirve la copia en caché */ });
        return hit;
      }

      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy).catch(() => {}));
          }
          return res;
        })
        .catch(fallback);
    })
  );
});

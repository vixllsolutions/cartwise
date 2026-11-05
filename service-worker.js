const CACHE_NAME = 'cartwise-v3-money-ration-2026-11';
const APP_FILES = [
  './', './index.html', './style.css', './script.js', './money-ration.js', './manifest.webmanifest',
  './assets/cartwise-logo.png', './assets/app-icon-192.png', './assets/app-icon-512.png',
  './assets/empty-cart.svg', './assets/shopping-basket.svg',
  './assets/products/apples.svg', './assets/products/bread.svg', './assets/products/custom.svg',
  './assets/products/eggs.svg', './assets/products/milk.svg', './assets/products/oil.svg', './assets/products/rice.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('cartwise-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match('./index.html'))));
});

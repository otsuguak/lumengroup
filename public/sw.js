// Lumen Habitat - Service Worker Básico
const CACHE_NAME = 'lumen-habitat-v1';

self.addEventListener('install', (event) => {
  console.log('[Lumen SW] Instalado con éxito');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Lumen SW] Activado');
  event.waitUntil(clients.claim());
});

// Interceptor de peticiones para cumplir el requisito PWA de Google
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
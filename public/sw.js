// 🔥 IMPORTANTE: OneSignal debe ser la primera línea
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Bautizamos la nueva era
const CACHE_NAME = 'vecinia-v1';

self.addEventListener('install', (event) => {
  console.log('[Vecinia SW] Instalado con éxito');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Vecinia SW] Activado y limpiando basura vieja...');
  
  // 🔥 LA ESCOBA MÁGICA: Esto busca memorias viejas y las ELIMINA
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Si el nombre del caché no es exactamente igual al nuevo, lo borra
          if (cacheName !== CACHE_NAME) {
            console.log('[Vecinia SW] Borrando caché viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptor de peticiones
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return; 
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
// 🔥 IMPORTANTE: OneSignal debe ser la primera línea para que funcione bien
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Lumen Habitat - Service Worker Básico
const CACHE_NAME = 'lumen-habitat-v3';

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
  
  // 🔥 LA REGLA DE ORO PARA SALVAR TUS EDGE FUNCTIONS 🔥
  // Si la petición NO es GET (como los POST a Supabase) o va a supabase.co,
  // el vigilante la ignora y deja que pase directo a internet.
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return; 
  }

  // Comportamiento original para PWA
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
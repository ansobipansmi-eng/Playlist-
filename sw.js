// sw.js
const CACHE_NAME = 'melodia-v1.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/player.js',
  '/js/playlist.js',
  '/js/dragdrop.js',
  '/js/pwa.js',
  '/manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      console.log('📦 Mise en cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
    .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activé');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Nettoyage du cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de cache: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les fichiers locaux (blob:)
  if (event.request.url.startsWith('blob:')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
    .then((response) => {
      // Mettre en cache les réponses réussies
      if (response && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseClone);
          });
      }
      return response;
    })
    .catch(() => {
      // Fallback sur le cache
      return caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Si c'est une page HTML, retourner la page par défaut
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          
          // Pour les autres ressources, retourner une erreur
          return new Response('Ressource non disponible hors ligne', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
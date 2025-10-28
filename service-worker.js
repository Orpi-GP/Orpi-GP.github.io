const CACHE_VERSION = 'orpi-v1.0.0';
const CACHE_NAME = `orpi-cache-${CACHE_VERSION}`;

const urlsToCache = [
    './index.html',
    './css/styles.css',
    './images.png'
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Mise en cache des ressources');
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.log('[Service Worker] Erreur cache:', url, err);
                        });
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Installation terminée');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[Service Worker] Erreur installation:', err);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activation...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Activé et prêt');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        
                        if (event.request.url.startsWith('http')) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(err => {
                                    console.log('[Service Worker] Erreur cache:', err);
                                });
                        }
                        
                        return response;
                    })
                    .catch(err => {
                        console.log('[Service Worker] Erreur fetch:', event.request.url);
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});


const CACHE_NAME = 'orpi-v2';
const STATIC_CACHE = 'orpi-static-v2';
const DYNAMIC_CACHE = 'orpi-dynamic-v2';

const CRITICAL_RESOURCES = [
    '/',
    '/index.html',
    '/css/critical.css',
    '/css/styles.css',
    '/js/config.js',
    '/js/theme.js',
    '/js/performance.js',
    '/images/logo-orpi-mandelieu.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(CRITICAL_RESOURCES).catch(err => {
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName.startsWith('orpi-')) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const { request } = e;
    const url = new URL(request.url);

    if (request.method !== 'GET') {
        return;
    }

    if (url.hostname.includes('firebase') && (url.pathname.includes('listen') || url.pathname.includes('channel'))) {
        return;
    }

    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
        e.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(DYNAMIC_CACHE).then((cache) => {
                                cache.put(request, responseClone);
                            });
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }
                return fetch(request).then((response) => {
                    if (!response.ok) {
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                });
            })
        );
        return;
    }

    if (request.headers.get('accept').includes('text/html')) {
        e.respondWith(
            fetch(request).then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                return caches.match(request).then((cachedResponse) => {
                    return cachedResponse || caches.match('/index.html');
                });
            })
        );
        return;
    }

    e.respondWith(
        fetch(request).then((response) => {
            if (response.ok && url.origin === location.origin) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(request, responseClone);
                });
            }
            return response;
        }).catch(() => {
            return caches.match(request);
        })
    );
});

self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'CLEAN_CACHE') {
        caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.keys().then((keys) => {
                if (keys.length > 50) {
                    cache.delete(keys[0]);
                }
            });
        });
    }
});

const CACHE_NAME='orpi-v1';const urlsToCache=['/css/critical.css','/js/config.js','/js/theme.js','/images/logo-orpi-mandelieu.png'];self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(urlsToCache)))});self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(response=>response||fetch(e.request)))});


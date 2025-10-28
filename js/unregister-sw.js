if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister().then(function() {
                console.log('Service Worker désenregistré avec succès');
            });
        }
    });
}

caches.keys().then(function(names) {
    for (let name of names) {
        caches.delete(name);
    }
    console.log('Tous les caches supprimés');
});


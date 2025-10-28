importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDmHcOaBCqcN_RbFhf3LvQaZmC4N0LW1F4",
    authDomain: "orpi-immobilier.firebaseapp.com",
    projectId: "orpi-immobilier",
    storageBucket: "orpi-immobilier.firebasestorage.app",
    messagingSenderId: "1036883803735",
    appId: "1:1036883803735:web:9d9dca4e39f5ebb2e51fc5",
    measurementId: "G-F3LE6WLWC6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Message reçu en arrière-plan:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/images/logo-orpi-mandelieu.png',
        badge: '/images/logo-orpi-mandelieu.png',
        tag: 'orpi-notification',
        requireInteraction: true,
        data: {
            url: payload.data?.url || '/dashboard-client.html'
        }
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    console.log('Notification cliquée:', event);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/dashboard-client.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});


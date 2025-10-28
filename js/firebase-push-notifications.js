const PushNotifications = {
    messaging: null,
    
    async init() {
        try {
            if (!firebase.messaging.isSupported()) {
                console.log('Push notifications non supportées sur ce navigateur');
                return false;
            }
            
            this.messaging = firebase.messaging();
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des notifications:', error);
            return false;
        }
    },
    
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Permission accordée pour les notifications');
                return await this.getToken();
            } else {
                console.log('Permission refusée pour les notifications');
                return null;
            }
        } catch (error) {
            console.error('Erreur lors de la demande de permission:', error);
            return null;
        }
    },
    
    async getToken() {
        try {
            const token = await this.messaging.getToken({
                vapidKey: 'YOUR_VAPID_KEY'
            });
            
            if (token) {
                console.log('Token FCM obtenu:', token);
                return token;
            } else {
                console.log('Pas de token disponible');
                return null;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du token:', error);
            return null;
        }
    },
    
    async saveToken(userId, token) {
        try {
            await firebase.firestore().collection('users').doc(userId).set({
                fcmToken: token,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('Token sauvegardé pour l\'utilisateur:', userId);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du token:', error);
        }
    },
    
    onMessageReceived(callback) {
        if (!this.messaging) return;
        
        this.messaging.onMessage((payload) => {
            console.log('Message reçu:', payload);
            
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: '/images/logo-orpi-mandelieu.png',
                badge: '/images/logo-orpi-mandelieu.png',
                tag: 'orpi-notification',
                requireInteraction: true
            };
            
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notificationTitle, notificationOptions);
            }
            
            if (callback) {
                callback(payload);
            }
        });
    },
    
    showLocalNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/images/logo-orpi-mandelieu.png',
                badge: '/images/logo-orpi-mandelieu.png',
                tag: 'orpi-notification'
            });
        }
    }
};

if (typeof window !== 'undefined') {
    window.PushNotifications = PushNotifications;
}


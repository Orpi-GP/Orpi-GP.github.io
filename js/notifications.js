class NotificationManager {
    constructor() {
        this.conversationsCollection = firebase.firestore().collection('conversations');
        this.unsubscribe = null;
    }
    async getUnreadCount(discordId) {
        try {
            if (discordId) {
                const snapshot = await this.conversationsCollection
                    .where('data.discordId', '==', discordId)
                    .get();
                const unreadCount = snapshot.docs.filter(doc => {
                    const data = doc.data();
                    if (!data.messages || data.messages.length === 0) return false;
                    const lastMessage = data.messages[data.messages.length - 1];
                    return lastMessage.sender === 'admin';
                }).length;
                return unreadCount;
            } else {
                const snapshot = await this.conversationsCollection.get();
                const unreadCount = snapshot.docs.filter(doc => {
                    const data = doc.data();
                    if (!data.messages || data.messages.length === 0) return false;
                    const lastMessage = data.messages[data.messages.length - 1];
                    return lastMessage.sender === 'client' && data.status === 'open';
                }).length;
                return unreadCount;
            }
        } catch (error) {
            console.error('Erreur lors du comptage des conversations:', error);
            return 0;
        }
    }
    onSnapshot(callback, discordId = null) {
        if (discordId) {
            this.unsubscribe = this.conversationsCollection
                .where('data.discordId', '==', discordId)
                .onSnapshot(snapshot => {
                    const unreadCount = snapshot.docs.filter(doc => {
                        const data = doc.data();
                        if (!data.messages || data.messages.length === 0) return false;
                        const lastMessage = data.messages[data.messages.length - 1];
                        return lastMessage.sender === 'admin';
                    }).length;
                    callback(unreadCount);
                });
        } else {
            this.unsubscribe = this.conversationsCollection
                .onSnapshot(snapshot => {
                    const unreadCount = snapshot.docs.filter(doc => {
                        const data = doc.data();
                        if (!data.messages || data.messages.length === 0) return false;
                        const lastMessage = data.messages[data.messages.length - 1];
                        return lastMessage.sender === 'client' && data.status === 'open';
                    }).length;
                    callback(unreadCount);
                });
        }
    }
    stopListening() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
let notificationManager = null;
document.addEventListener('DOMContentLoaded', () => {
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            clearInterval(checkFirebase);
            notificationManager = new NotificationManager();
            initNotifications();
        }
    }, 100);
});
function initNotifications() {
    const checkAuth = setInterval(() => {
        if (typeof discordAuth !== 'undefined') {
            clearInterval(checkAuth);
            if (discordAuth.isLoggedIn()) {
                setupNotificationsUI();
            }
        }
    }, 100);
}
function setupNotificationsUI() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsBadge = document.getElementById('notificationsBadge');
    const notificationBell = document.getElementById('notificationBell');
    if (notificationsBtn) {
        notificationsBtn.style.display = 'flex';
    } else if (notificationBell) {
        notificationBell.style.display = 'block';
    }
    if (notificationManager) {
        const isAdmin = discordAuth.isAuthorized();
        const discordId = isAdmin ? null : discordAuth.getUser().id;
        
        notificationManager.onSnapshot(unreadCount => {
            const badge = notificationsBadge || document.getElementById('notificationBadge');
            const btn = notificationsBtn || document.getElementById('notificationsBtn');
            const textElement = document.getElementById('notificationsText');
            
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
            
            if (textElement) {
                if (unreadCount > 0) {
                    const convText = unreadCount > 1 ? 'conversations en cours' : 'conversation en cours';
                    textElement.textContent = `${unreadCount} ${convText}`;
                    textElement.style.display = 'inline';
                } else {
                    textElement.style.display = 'none';
                }
            }
        }, discordId);
    }
}
function toggleNotifications() {
    if (discordAuth.isAuthorized()) {
        if (window.location.pathname.includes('admin.html')) {
            showConversationsModal();
        } else {
            window.location.href = 'admin.html#conversations';
        }
    } else {
        window.location.href = 'dashboard-client.html';
    }
}
function convertImageToBase64(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

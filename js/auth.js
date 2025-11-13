class DiscordAuth {
    constructor() {
        this.tokenKey = 'discord_token';
        this.userKey = 'discord_user';
    }
    
    getLoginUrl() {
        const params = new URLSearchParams({
            client_id: DISCORD_CONFIG.clientId,
            redirect_uri: DISCORD_CONFIG.redirectUri,
            response_type: 'token',
            scope: DISCORD_CONFIG.scope
        });
        return `https://discord.com/oauth2/authorize?${params.toString()}`;
    }
    
    saveToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }
    
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }
    
    saveUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    
    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }
    
    isLoggedIn() {
        return this.getToken() !== null && this.getUser() !== null;
    }
    
    async isAuthorized() {
        const user = this.getUser();
        if (!user) return false;
        
        // Vérifier d'abord dans config.js (compatibilité)
        if (DISCORD_CONFIG.authorizedIds.includes(user.id)) {
            return true;
        }
        
        // Vérifier aussi dans Firestore
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const db = firebase.firestore();
                const doc = await db.collection('admin_authorized_ids').doc(user.id).get();
                return doc.exists && doc.data().authorized === true;
            }
        } catch (error) {
            console.error('Erreur lors de la vérification Firestore:', error);
        }
        
        return false;
    }
    
    // Méthode synchrone pour compatibilité (utilise le cache)
    isAuthorizedSync() {
        const user = this.getUser();
        if (!user) return false;
        return DISCORD_CONFIG.authorizedIds.includes(user.id);
    }
    
    async fetchUserInfo(token) {
        try {
            const response = await fetch(`${DISCORD_API}/users/@me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des informations utilisateur');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur:', error);
            return null;
        }
    }
    
    getAvatarUrl(user) {
        if (user.avatar) {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        }
        return `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.id) >> 22) % 6}.png`;
    }
    
    getUsername(user) {
        if (user.discriminator && user.discriminator !== '0') {
            return `${user.username}#${user.discriminator}`;
        }
        return user.global_name || user.username;
    }
    
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        window.location.reload();
    }
}

const discordAuth = new DiscordAuth();

function updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const discordLoginBtn = document.getElementById('discordLoginBtn');
    const userProfile = document.getElementById('userProfile');
    const adminPanel = document.getElementById('adminPanel');
    const dashboardLink = document.getElementById('dashboardLink');
    
    if (discordAuth.isLoggedIn()) {
        const user = discordAuth.getUser();
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (discordLoginBtn) discordLoginBtn.style.display = 'none';
        
        if (userProfile) {
            userProfile.style.display = 'flex';
            const avatarElement = document.getElementById('userAvatar');
            const usernameElement = document.getElementById('userName');
            if (avatarElement) avatarElement.src = discordAuth.getAvatarUrl(user);
            if (usernameElement) usernameElement.textContent = discordAuth.getUsername(user);
        }
        
        if (dashboardLink) {
            dashboardLink.style.display = 'block';
            updateDashboardBadge(user.id);
        }
        
        // Vérification asynchrone pour Firestore
        discordAuth.isAuthorized().then(authorized => {
            if (adminPanel && authorized) {
                adminPanel.style.display = 'block';
            }
            
            if (authorized) {
                const tableauGeneralLink = document.getElementById('tableauGeneralLink');
                if (tableauGeneralLink) tableauGeneralLink.style.display = 'block';
            }
        });
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (discordLoginBtn) discordLoginBtn.style.display = 'inline-flex';
        if (userProfile) userProfile.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
        
        const tableauGeneralLink = document.getElementById('tableauGeneralLink');
        if (tableauGeneralLink) tableauGeneralLink.style.display = 'none';
    }
}

function loginWithDiscord() {
    window.location.href = discordAuth.getLoginUrl();
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        discordAuth.logout();
    }
}

async function updateDashboardBadge(userId) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            return;
        }
        
        const snapshot = await firebase.firestore()
            .collection('conversations')
            .where('data.discordId', '==', userId)
            .get();
        
        let unreadCount = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.messages) {
                unreadCount += data.messages.filter(msg => 
                    msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(userId))
                ).length;
            }
        });
        
        const badge = document.getElementById('dashboardBadge');
        if (badge && unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        }
        
        firebase.firestore()
            .collection('conversations')
            .where('data.discordId', '==', userId)
            .onSnapshot((snapshot) => {
                let count = 0;
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.messages) {
                        count += data.messages.filter(msg => 
                            msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(userId))
                        ).length;
                    }
                });
                
                const badgeElement = document.getElementById('dashboardBadge');
                if (badgeElement) {
                    if (count > 0) {
                        badgeElement.textContent = count;
                        badgeElement.style.display = 'inline-block';
                    } else {
                        badgeElement.style.display = 'none';
                    }
                }
            });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du badge:', error);
    }
}

document.addEventListener('DOMContentLoaded', updateUI);

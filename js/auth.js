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
    
    isAuthorized() {
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
        
        if (adminPanel && discordAuth.isAuthorized()) {
            adminPanel.style.display = 'block';
        }
        
        if (discordAuth.isAuthorized()) {
            const guidePrixLink = document.getElementById('guidePrixLink');
            const tableauGeneralLink = document.getElementById('tableauGeneralLink');
            if (guidePrixLink) guidePrixLink.style.display = 'block';
            if (tableauGeneralLink) tableauGeneralLink.style.display = 'block';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (discordLoginBtn) discordLoginBtn.style.display = 'inline-flex';
        if (userProfile) userProfile.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'none';
        
        const guidePrixLink = document.getElementById('guidePrixLink');
        const tableauGeneralLink = document.getElementById('tableauGeneralLink');
        if (guidePrixLink) guidePrixLink.style.display = 'none';
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

document.addEventListener('DOMContentLoaded', updateUI);

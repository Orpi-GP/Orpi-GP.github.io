function getRedirectUri() {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    if (hostname.includes('github.io')) {
        const parts = hostname.split('.');
        if (parts.length === 3 && parts[0] !== 'www') {
            return `${origin}/callback.html`;
        }
        
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(p => p && !p.includes('.'));
        const repoName = pathParts[0] || '';
        const baseUrl = repoName ? `${origin}/${repoName}` : origin;
        return `${baseUrl}/callback.html`;
    }
    
    return `${origin}/callback.html`;
}

window.DISCORD_CONFIG = {
    clientId: '1431754840723423313',
    redirectUri: getRedirectUri(),
    scope: 'identify',
    authorizedIds: [
        '317665879443767306',
        '1344790136629493832',
        '1146744331244412950',
        '375964979540525058',
        '335853228736380938'
    ]
};

const DISCORD_CONFIG = window.DISCORD_CONFIG;

const DISCORD_API = 'https://discord.com/api/v10';

const THEME_CONFIG = {
    activeTheme: 'halloween'
};


window.SITE_CONFIG = {
    maintenance: false,
    maintenanceMessage: "Nous effectuons une maintenance. Merci de revenir plus tard."
};

(function ensureFreshConfig(){
    try{
        if (!window.__CONFIG_REFRESHED__) {
            window.__CONFIG_REFRESHED__ = true;
            var s = document.createElement('script');
            s.src = 'js/config.js?v=' + Date.now();
            s.defer = true;
            document.head.appendChild(s);
            return; 
        }
    }catch(e){}
})();

(function enforceMaintenance() {
    try {
        if (!window.SITE_CONFIG || !window.SITE_CONFIG.maintenance) return;
        try {
            var u = new URL(window.location.href);
            if (!u.searchParams.get('__v')) {
                u.searchParams.set('__v', Date.now().toString());
                return window.location.replace(u.toString());
            }
        } catch(e){}
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            navigator.serviceWorker.getRegistrations().then(function(regs){
                regs.forEach(function(r){ try{ r.unregister(); }catch(e){} });
            });
        }
        var target = 'maintenance.html';
        try{
            var loc = new URL(window.location.href);
            if (loc.pathname.endsWith('/maintenance.html')) return; 
            var m = new URL(target, loc.origin + loc.pathname);
            m.searchParams.set('__v', Date.now().toString());
            return window.location.replace(m.toString());
        }catch(e){
            window.location.replace('maintenance.html');
        }
    } catch(e) {}
})();

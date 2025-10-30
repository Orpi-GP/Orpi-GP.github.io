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
    activeTheme: 'default'
};


window.SITE_CONFIG = {
    maintenance: true,
    maintenanceMessage: "Nous effectuons une maintenance. Merci de revenir plus tard."
};

(function enforceMaintenance() {
    try {
        if (!window.SITE_CONFIG || !window.SITE_CONFIG.maintenance) return;
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            navigator.serviceWorker.getRegistrations().then(function(regs){
                regs.forEach(function(r){ try{ r.unregister(); }catch(e){} });
            });
        }
        try { sessionStorage.setItem('MAINTENANCE_MODE','1'); } catch(e){}
        try {
            if (window.history && window.history.pushState) {
                window.history.pushState(null, '', window.location.href);
                window.addEventListener('popstate', function(){ window.history.pushState(null, '', window.location.href); });
            }
        } catch(e){}
        var html = '\n<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Maintenance - ORPI Paris</title>\n<style>\n:root{--primary:#E30613}body{margin:0;font-family:system-ui,-apple-system,Seg\n oe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;background:#f6f7f9;color:#1a1a1a} .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem} .card{background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.1);max-width:700px;width:100%;padding:2rem;text-align:center} .logo{width:80px;height:80px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;background:var(--primary);color:#fff;font-weight:800;font-size:1.6rem;margin-bottom:1rem} h1{margin:.5rem 0 1rem 0;font-size:1.8rem} p{margin:0;color:#555;line-height:1.6} .spinner{width:48px;height:48px;border:5px solid #eee;border-top:5px solid var(--primary);border-radius:50%;margin:1.5rem auto;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}} .small{margin-top:1rem;font-size:.9rem;color:#777}\n</style>\n</head>\n<body>\n<div class="wrap">\n  <div class="card">\n    <div class="logo">ORPI</div>\n    <h1>Site en maintenance</h1>\n    <p>'+ (window.SITE_CONFIG.maintenanceMessage||'Maintenance en cours, merci de revenir plus tard.') +'</p>\n    <div class="spinner"></div>\n    <div class="small">Merci de votre compréhension.</div>\n  </div>\n</div>\n</body>\n</html>';
        document.open();
        document.write(html);
        document.close();
        if (window.stop) { try { window.stop(); } catch(e){} }
        throw new Error('Maintenance enabled');
    } catch(e) {}
})();

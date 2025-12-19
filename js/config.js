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

if (!window.DISCORD_CONFIG) {
window.DISCORD_CONFIG = {
    clientId: '1431754840723423313',
    redirectUri: getRedirectUri(),
    scope: 'identify',
    authorizedIds: [
        '317665879443767306',
        '1344790136629493832',
        '1146744331244412950',
        '375964979540525058',
        '335853228736380938',
        '455099709648928783', // randy
    ],
    adminManagerIds: [
        '317665879443767306',
        '1344790136629493832',
        '1146744331244412950',
        '375964979540525058',
        '455099709648928783', // randy
    ]
};
}

const DISCORD_CONFIG = window.DISCORD_CONFIG;

const DISCORD_API = 'https://discord.com/api/v10';

const THEME_CONFIG = {
    activeTheme: 'default'
};


window.SITE_CONFIG = {
    maintenance: false,
    maintenanceMessage: "Nous effectuons une maintenance. Merci de revenir plus tard."
};


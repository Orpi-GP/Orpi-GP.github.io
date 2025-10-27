const fragment = new URLSearchParams(window.location.hash.slice(1));
const accessToken = fragment.get('access_token');

// Fonction pour obtenir l'URL de base selon l'environnement
function getBaseUrl() {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    if (hostname.includes('github.io')) {
        const parts = hostname.split('.');
        if (parts.length === 3 && parts[0] !== 'www') {
            return origin;
        }
        
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(p => p && !p.includes('.'));
        const repoName = pathParts[0] || '';
        return repoName ? `${origin}/${repoName}` : origin;
    }
    
    return origin;
}

async function handleCallback() {
    if (!accessToken) {
        showError('Erreur : Aucun token d\'accès reçu.');
        setTimeout(() => window.location.href = getBaseUrl() + '/index.html', 3000);
        return;
    }

    try {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des informations');
        }

        const user = await response.json();

        localStorage.setItem('discord_token', accessToken);
        localStorage.setItem('discord_user', JSON.stringify(user));

        window.location.href = getBaseUrl() + '/index.html';
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la connexion. Redirection...');
        setTimeout(() => window.location.href = getBaseUrl() + '/index.html', 3000);
    }
}

function showError(message) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    document.querySelector('.spinner').style.display = 'none';
}

handleCallback();


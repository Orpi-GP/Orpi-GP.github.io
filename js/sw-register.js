if ('serviceWorker' in navigator) {
    let refreshing = false;
    
    navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
            console.log('✅ Service Worker enregistré');
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nouvelle version détectée...');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification(newWorker);
                    }
                });
            });
        })
        .catch((error) => {
            console.error('❌ Erreur Service Worker:', error);
        });
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

function showUpdateNotification(worker) {
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #E30613, #b30510);
        color: white;
        padding: 1rem 2rem;
        text-align: center;
        z-index: 999999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: slideDown 0.5s ease;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
    `;
    
    banner.innerHTML = `
        <style>
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            .update-btn {
                background: white;
                color: #E30613;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
                animation: pulse 2s infinite;
            }
            .update-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 15px rgba(255,255,255,0.5);
            }
            .dismiss-btn {
                background: transparent;
                color: white;
                border: 2px solid white;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            .dismiss-btn:hover {
                background: rgba(255,255,255,0.2);
            }
        </style>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-sync-alt" style="font-size: 1.5rem; animation: spin 2s linear infinite;"></i>
            <span style="font-size: 1.1rem; font-weight: 600;">
                🎉 Nouvelle version disponible !
            </span>
        </div>
        <button class="update-btn" onclick="updateNow()">
            <i class="fas fa-download"></i> Mettre à jour maintenant
        </button>
        <button class="dismiss-btn" onclick="dismissUpdate()">
            Plus tard
        </button>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    window.updateNow = () => {
        worker.postMessage({ type: 'SKIP_WAITING' });
        banner.style.animation = 'slideDown 0.5s ease reverse';
        setTimeout(() => banner.remove(), 500);
    };
    
    window.dismissUpdate = () => {
        banner.style.animation = 'slideDown 0.5s ease reverse';
        setTimeout(() => banner.remove(), 500);
    };
}


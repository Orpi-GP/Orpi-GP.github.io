document.addEventListener('DOMContentLoaded', async () => {
    if (!discordAuth.isLoggedIn()) {
        document.getElementById('loginRequired').style.display = 'block';
        document.getElementById('dashboardContent').style.display = 'none';
        document.getElementById('dashboardLink').style.display = 'none';
    } else {
        document.getElementById('loginRequired').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        document.getElementById('dashboardLink').style.display = 'block';
        
        const user = discordAuth.getUser();
        document.getElementById('dashboardUsername').textContent = discordAuth.getUsername(user);
        
        await loadDashboardData(user.id);
    }
});

async function loadDashboardData(userId) {
    try {
        const conversations = await ConversationsManager.getByDiscordId(userId);
        
        const activeConversations = conversations.filter(conv => conv.status === 'open').length;
        document.getElementById('activeConversations').textContent = activeConversations;
        
        const unreadCount = await ConversationsManager.getUnreadCount(userId);
        document.getElementById('unreadMessages').textContent = unreadCount;
        
        const appointments = await getAppointmentsCount(userId);
        document.getElementById('appointments').textContent = appointments;
        
        const favorites = getFavoritesCount();
        document.getElementById('favorites').textContent = favorites;
        
        displayRecentActivity(conversations);
        
    } catch (error) {
        console.error('Erreur lors du chargement des données du dashboard:', error);
    }
}

async function getAppointmentsCount(userId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('appointments')
            .where('data.discordId', '==', userId)
            .where('status', '==', 'pending')
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Erreur lors du comptage des rendez-vous:', error);
        return 0;
    }
}

function getFavoritesCount() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.length;
}

function displayRecentActivity(conversations) {
    const activityList = document.getElementById('activityList');
    
    if (!conversations || conversations.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-item-title">Aucune activité récente</div>
                <div class="activity-item-date">Commencez par explorer nos services</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    conversations.slice(0, 5).forEach(conv => {
        const typeLabel = conv.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation';
        const typeIcon = conv.type === 'contact' ? 'fa-envelope' : 'fa-calculator';
        
        let date = 'Date inconnue';
        if (conv.lastUpdated) {
            try {
                const dateObj = conv.lastUpdated.toDate ? conv.lastUpdated.toDate() : new Date(conv.lastUpdated);
                date = dateObj.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                console.error('Erreur de conversion de date:', e);
            }
        }
        
        const lastMessage = conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1].message 
            : 'Aucun message';
        
        html += `
            <div class="activity-item">
                <div class="activity-item-title">
                    <i class="fas ${typeIcon}"></i> ${typeLabel}
                </div>
                <div style="font-size: 0.9rem; color: #333; margin: 0.5rem 0;">
                    ${lastMessage.substring(0, 100)}${lastMessage.length > 100 ? '...' : ''}
                </div>
                <div class="activity-item-date">
                    <i class="fas fa-clock"></i> ${date}
                </div>
            </div>
        `;
    });
    
    activityList.innerHTML = html;
}

function showToast(message, type = 'info') {
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3',
        warning: '#ff9800'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


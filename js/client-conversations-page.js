let unsubscribeConversations = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!discordAuth.isLoggedIn()) {
        document.getElementById('loginPrompt').style.display = 'block';
        document.getElementById('conversationsHeader').style.display = 'none';
        document.getElementById('clientConversationsList').style.display = 'none';
    } else {
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('conversationsHeader').style.display = 'block';
        document.getElementById('clientConversationsList').style.display = 'block';
        
        const user = discordAuth.getUser();
        document.getElementById('connectedUsername').textContent = discordAuth.getUsername(user);
        
        loadClientConversations(user.id);
    }
});

async function loadClientConversations(discordId) {
    const listContainer = document.getElementById('clientConversationsList');
    
    listContainer.innerHTML = '<div class="loading">Chargement de vos conversations...</div>';
    
    if (unsubscribeConversations) {
        unsubscribeConversations();
    }
    
    try {
        const conversations = await ConversationsManager.getByDiscordId(discordId);
        displayClientConversations(conversations, discordId);
        
        unsubscribeConversations = firebase.firestore()
            .collection('conversations')
            .where('data.discordId', '==', discordId)
            .onSnapshot((snapshot) => {
                const updatedConversations = [];
                snapshot.forEach(doc => {
                    updatedConversations.push({ id: doc.id, ...doc.data() });
                });
                displayClientConversations(updatedConversations, discordId);
            });
    } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erreur lors du chargement des conversations</p>
            </div>
        `;
    }
}

function displayClientConversations(conversations, discordId) {
    const listContainer = document.getElementById('clientConversationsList');
    
    if (conversations.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Aucune conversation trouvée pour ce pseudo</p>
            </div>
        `;
        return;
    }
    
    conversations.sort((a, b) => {
        if (!a.lastUpdated || !b.lastUpdated) return 0;
        return b.lastUpdated.toDate() - a.lastUpdated.toDate();
    });
    
    let html = '';
    
    conversations.forEach(conv => {
        const isActive = conv.status === 'open';
        
        let date = 'Date inconnue';
        if (conv.lastUpdated) {
            try {
                const dateObj = conv.lastUpdated.toDate ? conv.lastUpdated.toDate() : new Date(conv.lastUpdated);
                date = dateObj.toLocaleDateString('fr-FR');
            } catch (e) {
                console.error('Erreur de conversion de date:', e);
            }
        }
        
        const typeLabel = conv.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation';
        const typeIcon = conv.type === 'contact' ? 'fa-envelope' : 'fa-calculator';
        
        html += `
            <div class="conversation-card ${isActive ? '' : 'closed'}">
                <div class="conversation-header">
                    <div class="conversation-type">
                        <i class="fas ${typeIcon}"></i> ${typeLabel}
                    </div>
                    <div class="conversation-status ${isActive ? 'status-active' : 'status-closed'}">
                        ${isActive ? '<i class="fas fa-comment-dots"></i> Active' : '<i class="fas fa-check"></i> Clôturée'}
                    </div>
                </div>
                <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">
                    <i class="fas fa-clock"></i> Dernière mise à jour: ${date}
                </div>
                
                <div class="conversation-messages">
        `;
        
        if (conv.messages && conv.messages.length > 0) {
            conv.messages.forEach(msg => {
                const isClient = msg.sender === 'client';
                const senderName = isClient ? 'Vous' : 'ORPI Admin';
                const messageClass = isClient ? 'message-client' : 'message-admin';
                const icon = isClient ? 'fa-user' : 'fa-user-shield';
                
                let time = '';
                if (msg.timestamp) {
                    try {
                        const date = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                        time = date.toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } catch (e) {
                        console.error('Erreur de conversion de date:', e);
                        time = '';
                    }
                }
                
                html += `
                    <div class="message-item ${messageClass}">
                        <div class="message-sender">
                            <i class="fas ${icon}"></i> ${senderName}
                            <span class="message-time">${time}</span>
                        </div>
                        <div style="white-space: pre-wrap;">${msg.message}</div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        
        if (isActive) {
            html += `
                <div class="reply-section">
                    <textarea id="reply-${conv.id}" placeholder="Écrivez votre réponse..."></textarea>
                    <button onclick="sendClientReply('${conv.id}', '${discordId}')">
                        <i class="fas fa-paper-plane"></i> Envoyer
                    </button>
                </div>
            `;
        } else {
            html += `
                <div style="margin-top: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 6px; text-align: center; color: #666;">
                    <i class="fas fa-lock"></i> Cette conversation est clôturée
                </div>
            `;
        }
        
        html += '</div>';
    });
    
    listContainer.innerHTML = html;
}

async function sendClientReply(conversationId, discordId) {
    const textarea = document.getElementById(`reply-${conversationId}`);
    const message = textarea.value.trim();
    
    if (!message) {
        alert('Veuillez entrer un message');
        return;
    }
    
    try {
        await ConversationsManager.addMessage(conversationId, 'client', message);
        textarea.value = '';
        
        const conversations = await ConversationsManager.getByDiscordId(discordId);
        displayClientConversations(conversations, discordId);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    }
}


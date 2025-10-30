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
        await loadDashboardMessaging(user.id);
    }
});

let currentUserId = null;
let currentConversationId = null;
let conversationsUnsubscribe = null;
let selectedFiles = [];

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadDashboardMessaging(userId) {
    currentUserId = userId;
    
    try {
        const conversations = await ConversationsManager.getByDiscordId(userId);
        
        if (conversations.length === 0) {
            document.getElementById('messagingEmpty').style.display = 'block';
            document.getElementById('messagingContent').style.display = 'none';
        } else {
            document.getElementById('messagingEmpty').style.display = 'none';
            document.getElementById('messagingContent').style.display = 'grid';
            displayConversationsList(conversations);
            
            let unreadCount = 0;
            conversations.forEach(conv => {
                if (conv.messages) {
                    unreadCount += conv.messages.filter(msg => 
                        msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(userId))
                    ).length;
                }
            });
            
            if (unreadCount > 0) {
                const badge = document.getElementById('unreadBadge');
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
                
                const navBadge = document.getElementById('dashboardBadge');
                if (navBadge) {
                    navBadge.textContent = unreadCount;
                    navBadge.style.display = 'inline-block';
                }
            } else {
                const navBadge = document.getElementById('dashboardBadge');
                if (navBadge) {
                    navBadge.style.display = 'none';
                }
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            const convId = urlParams.get('conv');
            if (convId && conversations.find(c => c.id === convId)) {
                setTimeout(() => {
                    const messagingSection = document.querySelector('.dashboard-section:nth-child(2)');
                    if (messagingSection) {
                        messagingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    selectConversation(convId);
                }, 800);
            }
        }
        
        if (conversationsUnsubscribe) {
            conversationsUnsubscribe();
        }
        
        conversationsUnsubscribe = firebase.firestore()
            .collection('conversations')
            .where('data.discordId', '==', userId)
            .onSnapshot((snapshot) => {
                const updatedConversations = [];
                snapshot.forEach(doc => {
                    updatedConversations.push({ id: doc.id, ...doc.data() });
                });
                
                updatedConversations.sort((a, b) => {
                    if (!a.lastUpdated || !b.lastUpdated) return 0;
                    return b.lastUpdated.toDate() - a.lastUpdated.toDate();
                });
                
                if (updatedConversations.length > 0) {
                    document.getElementById('messagingEmpty').style.display = 'none';
                    document.getElementById('messagingContent').style.display = 'grid';
                    displayConversationsList(updatedConversations);
                    
                    let unreadCount = 0;
                    updatedConversations.forEach(conv => {
                        if (conv.messages) {
                            unreadCount += conv.messages.filter(msg => 
                                msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(userId))
                            ).length;
                        }
                    });
                    
                    const badge = document.getElementById('unreadBadge');
                    const navBadge = document.getElementById('dashboardBadge');
                    
                    if (unreadCount > 0) {
                        if (badge) {
                            badge.textContent = unreadCount;
                            badge.style.display = 'inline-block';
                        }
                        if (navBadge) {
                            navBadge.textContent = unreadCount;
                            navBadge.style.display = 'inline-block';
                        }
                        document.getElementById('unreadMessages').textContent = unreadCount;
                    } else {
                        if (badge) badge.style.display = 'none';
                        if (navBadge) navBadge.style.display = 'none';
                        document.getElementById('unreadMessages').textContent = '0';
                    }
                    
                    if (currentConversationId) {
                        const conv = updatedConversations.find(c => c.id === currentConversationId);
                        if (conv) {
                            displayConversationDetail(conv);
                        }
                    }
                }
            });
        
    } catch (error) {
        console.error('Erreur lors du chargement de la messagerie:', error);
    }
}

function displayConversationsList(conversations) {
    const listContainer = document.getElementById('conversationsList');
    
    let html = '';
    conversations.forEach(conv => {
        const typeLabel = conv.type === 'contact' ? 'Contact' : 'Estimation';
        const typeIcon = conv.type === 'contact' ? 'fa-envelope' : 'fa-calculator';
        
        const unreadCount = conv.messages ? conv.messages.filter(msg => 
            msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(currentUserId))
        ).length : 0;
        
        let date = '';
        if (conv.lastUpdated) {
            try {
                const dateObj = conv.lastUpdated.toDate ? conv.lastUpdated.toDate() : new Date(conv.lastUpdated);
                date = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
            } catch (e) {
                console.error('Erreur de conversion de date:', e);
            }
        }
        
        let lastMessage = conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1].message 
            : 'Aucun message';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lastMessage;
        const lastMessageText = tempDiv.textContent || tempDiv.innerText || lastMessage;
        
        const isActive = currentConversationId === conv.id;
        const isUnread = unreadCount > 0;
        
        html += `
            <div class="conversation-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}" onclick="selectConversation('${conv.id}')">
                <div class="conversation-item-header">
                    <div class="conversation-item-title">
                        <i class="fas ${typeIcon}"></i> ${typeLabel}
                        ${unreadCount > 0 ? `<span style="background: #E30613; color: white; padding: 0.1rem 0.4rem; border-radius: 10px; font-size: 0.7rem; margin-left: 0.5rem;">${unreadCount}</span>` : ''}
                    </div>
                    <div class="conversation-item-date">${date}</div>
                </div>
                <div class="conversation-item-preview">${escapeHtml(lastMessageText)}</div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
}

async function selectConversation(conversationId) {
    currentConversationId = conversationId;
    
    try {
        const conversations = await ConversationsManager.getByDiscordId(currentUserId);
        const conv = conversations.find(c => c.id === conversationId);
        
        if (conv) {
            displayConversationDetail(conv);
            await ConversationsManager.markMessagesAsRead(conversationId, currentUserId);
            displayConversationsList(conversations);
        }
    } catch (error) {
        console.error('Erreur lors de la sélection de la conversation:', error);
    }
}

function displayConversationDetail(conv) {
    const detailContainer = document.getElementById('conversationDetail');
    
    const typeLabel = conv.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation';
    
    let html = `
        <h3 style="margin-bottom: 1rem; color: var(--primary-color);">
            ${typeLabel}
        </h3>
        <div class="conversation-messages" id="conversationMessages">
    `;
    
    if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach(msg => {
            const isClient = msg.sender === 'client';
            const senderName = isClient ? 'Vous' : 'ORPI Admin';
            const messageClass = isClient ? 'client' : 'admin';
            
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
                }
            }
            
            let messageDisplay = msg.message || '';
            if (messageDisplay.includes('<a href=')) {
                messageDisplay = messageDisplay.replace(/\n/g, '<br>');
            } else {
                messageDisplay = escapeHtml(messageDisplay).replace(/\n/g, '<br>');
            }
            
            html += `
                <div class="message-bubble ${messageClass}">
                    <div class="message-sender">
                        <i class="fas fa-${isClient ? 'user' : 'user-shield'}"></i>
                        ${senderName}
                    </div>
                    <div class="message-text">${messageDisplay}</div>
            `;
            
            if (msg.attachments && msg.attachments.length > 0) {
                html += '<div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">';
                msg.attachments.forEach(att => {
                    const isImage = att.type && att.type.startsWith('image/');
                    if (isImage) {
                        html += `
                            <a href="${escapeHtml(att.url)}" target="_blank" style="display: block; border-radius: 8px; overflow: hidden; max-width: 150px; border: 2px solid #e0e0e0;">
                                <img src="${escapeHtml(att.url)}" alt="${escapeHtml(att.name)}" style="width: 100%; height: auto; display: block;" />
                            </a>
                        `;
                    } else {
                        html += `
                            <a href="${escapeHtml(att.url)}" target="_blank" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: white; border: 1px solid #e0e0e0; border-radius: 5px; text-decoration: none; color: #333; font-size: 0.85rem;">
                                <i class="fas fa-file"></i> ${escapeHtml(att.name)}
                            </a>
                        `;
                    }
                });
                html += '</div>';
            }
            
            html += `
                    <div class="message-time">${time}</div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    
    if (conv.status === 'open') {
        html += `
            <div class="conversation-reply">
                <div id="attachmentsPreview" class="attachments-preview" style="display: none;"></div>
                <div class="reply-input-area">
                    <textarea id="replyText" placeholder="Écrivez votre réponse..."></textarea>
                    <div class="reply-buttons">
                        <input type="file" id="fileInput" accept="image/*" multiple style="display: none;" onchange="handleFileSelect(event)">
                        <button class="attach-file-btn" onclick="document.getElementById('fileInput').click()">
                            <i class="fas fa-paperclip"></i>
                        </button>
                        <button onclick="sendReply()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="padding: 1rem; background: #f5f5f5; border-radius: 8px; text-align: center; color: #666;">
                <i class="fas fa-lock"></i> Cette conversation est clôturée
            </div>
        `;
    }
    
    detailContainer.innerHTML = html;
    
    const messagesContainer = document.getElementById('conversationMessages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = [...selectedFiles, ...files];
    displayAttachmentsPreview();
}

function displayAttachmentsPreview() {
    const previewContainer = document.getElementById('attachmentsPreview');
    if (!previewContainer) return;
    
    if (selectedFiles.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'flex';
    previewContainer.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button class="remove-preview" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayAttachmentsPreview();
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', window.CLOUDINARY_CONFIG.uploadPreset);
    
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CONFIG.cloudName}/image/upload`,
        {
            method: 'POST',
            body: formData
        }
    );
    
    if (!response.ok) {
        throw new Error('Erreur lors de l\'upload de l\'image');
    }
    
    const data = await response.json();
    return {
        url: data.secure_url,
        name: file.name,
        type: file.type
    };
}

async function sendReply() {
    const textarea = document.getElementById('replyText');
    const message = textarea.value.trim();
    
    if (!message && selectedFiles.length === 0) {
        showToast('Veuillez entrer un message', 'warning');
        return;
    }
    
    try {
        let attachments = [];
        
        if (selectedFiles.length > 0) {
            showToast('Upload des images en cours...', 'info');
            
            for (const file of selectedFiles) {
                try {
                    const attachment = await uploadToCloudinary(file);
                    attachments.push(attachment);
                } catch (error) {
                    console.error('Erreur upload:', error);
                    showToast('Erreur lors de l\'upload d\'une image', 'error');
                }
            }
        }
        
        await ConversationsManager.addMessage(currentConversationId, 'client', message || ' ', attachments);
        
        textarea.value = '';
        selectedFiles = [];
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        const previewContainer = document.getElementById('attachmentsPreview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
            previewContainer.innerHTML = '';
        }
        
        showToast('Message envoyé !', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        showToast('Erreur lors de l\'envoi du message', 'error');
    }
}

function openNewConversationModal() {
    document.getElementById('newConversationModal').style.display = 'flex';
}

function closeNewConversationModal() {
    document.getElementById('newConversationModal').style.display = 'none';
    document.getElementById('conversationSubject').value = '';
    document.getElementById('conversationMessage').value = '';
}

async function startNewConversation(event) {
    event.preventDefault();
    
    const subject = document.getElementById('conversationSubject').value.trim();
    const message = document.getElementById('conversationMessage').value.trim();
    
    if (!subject || !message) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }
    
    try {
        const user = discordAuth.getUser();
        const phone = user.phone || 'Non renseigné';
        
        const conversationData = {
            type: 'contact',
            data: {
                discordId: user.id,
                phone: phone,
                subject: subject
            }
        };
        
        const newConv = await ConversationsManager.add(conversationData);
        await ConversationsManager.addMessage(newConv.id, 'client', message, []);
        
        closeNewConversationModal();
        showToast('Conversation créée !', 'success');
        
        await loadDashboardMessaging(currentUserId);
    } catch (error) {
        console.error('Erreur lors de la création de la conversation:', error);
        showToast('Erreur lors de la création de la conversation', 'error');
    }
}

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
        
        let lastMessage = conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1].message 
            : 'Aucun message';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lastMessage;
        const lastMessageText = tempDiv.textContent || tempDiv.innerText || lastMessage;
        
        const preview = lastMessageText.substring(0, 100) + (lastMessageText.length > 100 ? '...' : '');
        
        html += `
            <div class="activity-item">
                <div class="activity-item-title">
                    <i class="fas ${typeIcon}"></i> ${typeLabel}
                </div>
                <div style="font-size: 0.9rem; color: #333; margin: 0.5rem 0;">
                    ${escapeHtml(preview)}
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


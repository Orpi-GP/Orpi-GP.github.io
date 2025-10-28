let unsubscribeConversations = null;

document.addEventListener('DOMContentLoaded', async () => {
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
        
        await initPushNotifications(user.id);
        
        listenForNewMessages(user.id);
    }
});

async function initPushNotifications(userId) {
    try {
        const initialized = await PushNotifications.init();
        
        if (initialized && Notification.permission === 'default') {
            setTimeout(async () => {
                const token = await PushNotifications.requestPermission();
                if (token) {
                    await PushNotifications.saveToken(userId, token);
                }
            }, 3000);
        } else if (initialized && Notification.permission === 'granted') {
            const token = await PushNotifications.getToken();
            if (token) {
                await PushNotifications.saveToken(userId, token);
            }
        }
        
        PushNotifications.onMessageReceived((payload) => {
            loadClientConversations(userId);
        });
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des notifications:', error);
    }
}

function listenForNewMessages(userId) {
    let previousMessageCount = 0;
    
    firebase.firestore()
        .collection('conversations')
        .where('data.discordId', '==', userId)
        .onSnapshot((snapshot) => {
            let totalMessages = 0;
            let unreadMessages = 0;
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.messages) {
                    totalMessages += data.messages.length;
                    unreadMessages += data.messages.filter(msg => 
                        msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(userId))
                    ).length;
                }
            });
            
            if (totalMessages > previousMessageCount && previousMessageCount > 0) {
                PushNotifications.showLocalNotification(
                    'Nouveau message ORPI',
                    'Vous avez reçu un nouveau message de notre équipe'
                );
            }
            
            previousMessageCount = totalMessages;
            
            if (unreadMessages > 0) {
                document.title = `(${unreadMessages}) Mes Conversations - ORPI`;
            } else {
                document.title = 'Mes Conversations - ORPI Immobilier Paris';
            }
        });
}

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
        
        let unreadCount = 0;
        if (conv.messages) {
            unreadCount = conv.messages.filter(msg => 
                msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(discordId))
            ).length;
        }
        
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
            <div class="conversation-card ${isActive ? '' : 'closed'}" onclick="markConversationAsRead('${conv.id}', '${discordId}')">
                <div class="conversation-header">
                    <div class="conversation-type">
                        <i class="fas ${typeIcon}"></i> ${typeLabel}
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
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
                
                const isUnread = !isClient && (!msg.readBy || !msg.readBy.includes(discordId));
                
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
                    <div class="message-item ${messageClass} ${isUnread ? 'message-unread' : ''}">
                        <div class="message-sender">
                            <i class="fas ${icon}"></i> ${senderName}
                            <span class="message-time">${time}</span>
                            ${isUnread ? '<span class="new-badge">NOUVEAU</span>' : ''}
                        </div>
                        <div style="white-space: pre-wrap;">${msg.message}</div>
                `;
                
                if (msg.attachments && msg.attachments.length > 0) {
                    html += '<div class="message-attachments">';
                    msg.attachments.forEach(att => {
                        const isImage = att.type && att.type.startsWith('image/');
                        if (isImage) {
                            html += `
                                <a href="${att.url}" target="_blank" class="attachment-image">
                                    <img src="${att.url}" alt="${att.name}" />
                                </a>
                            `;
                        } else {
                            html += `
                                <a href="${att.url}" target="_blank" class="attachment-file">
                                    <i class="fas fa-file"></i> ${att.name}
                                </a>
                            `;
                        }
                    });
                    html += '</div>';
                }
                
                html += '</div>';
            });
        }
        
        html += '</div>';
        
        if (isActive) {
            html += `
                <div class="reply-section">
                    <textarea id="reply-${conv.id}" placeholder="Écrivez votre réponse..."></textarea>
                    <div class="reply-actions">
                        <input type="file" id="file-${conv.id}" multiple accept="image/*,.pdf,.doc,.docx" style="display: none;" onchange="handleFileSelect('${conv.id}')">
                        <button class="attach-btn" onclick="document.getElementById('file-${conv.id}').click(); event.stopPropagation();">
                            <i class="fas fa-paperclip"></i> Joindre
                        </button>
                        <button class="send-btn" onclick="sendClientReply('${conv.id}', '${discordId}'); event.stopPropagation();">
                            <i class="fas fa-paper-plane"></i> Envoyer
                        </button>
                    </div>
                    <div id="attachments-preview-${conv.id}" class="attachments-preview"></div>
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

let selectedFiles = {};

async function handleFileSelect(conversationId) {
    const fileInput = document.getElementById(`file-${conversationId}`);
    const files = Array.from(fileInput.files);
    
    if (!selectedFiles[conversationId]) {
        selectedFiles[conversationId] = [];
    }
    
    selectedFiles[conversationId] = [...selectedFiles[conversationId], ...files];
    
    displayAttachmentsPreview(conversationId);
}

function displayAttachmentsPreview(conversationId) {
    const previewContainer = document.getElementById(`attachments-preview-${conversationId}`);
    const files = selectedFiles[conversationId] || [];
    
    if (files.length === 0) {
        previewContainer.innerHTML = '';
        return;
    }
    
    let html = '<div class="preview-items">';
    files.forEach((file, index) => {
        const isImage = file.type.startsWith('image/');
        html += `
            <div class="preview-item">
                ${isImage ? `<i class="fas fa-image"></i>` : `<i class="fas fa-file"></i>`}
                <span>${file.name}</span>
                <button onclick="removeAttachment('${conversationId}', ${index}); event.stopPropagation();" class="remove-attachment">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    html += '</div>';
    
    previewContainer.innerHTML = html;
}

function removeAttachment(conversationId, index) {
    if (selectedFiles[conversationId]) {
        selectedFiles[conversationId].splice(index, 1);
        displayAttachmentsPreview(conversationId);
    }
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', window.CLOUDINARY_CONFIG.uploadPreset);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CONFIG.cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du fichier');
    }
    
    const data = await response.json();
    return {
        url: data.secure_url,
        name: file.name,
        type: file.type,
        size: file.size
    };
}

async function sendClientReply(conversationId, discordId) {
    const textarea = document.getElementById(`reply-${conversationId}`);
    const message = textarea.value.trim();
    const files = selectedFiles[conversationId] || [];
    
    if (!message && files.length === 0) {
        alert('Veuillez entrer un message ou joindre un fichier');
        return;
    }
    
    try {
        const sendBtn = event.target.closest('.send-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
        }
        
        let attachments = [];
        
        if (files.length > 0) {
            for (const file of files) {
                const uploadedFile = await uploadToCloudinary(file);
                attachments.push(uploadedFile);
            }
        }
        
        await ConversationsManager.addMessage(conversationId, 'client', message || '', attachments);
        
        textarea.value = '';
        selectedFiles[conversationId] = [];
        
        const previewContainer = document.getElementById(`attachments-preview-${conversationId}`);
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        const conversations = await ConversationsManager.getByDiscordId(discordId);
        displayClientConversations(conversations, discordId);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    }
}

async function markConversationAsRead(conversationId, userId) {
    try {
        await ConversationsManager.markMessagesAsRead(conversationId, userId);
    } catch (error) {
        console.error('Erreur lors du marquage comme lu:', error);
    }
}


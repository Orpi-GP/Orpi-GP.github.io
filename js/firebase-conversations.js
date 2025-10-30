const ConversationsManager = {
    async add(conversationData) {
        try {
            const conversation = {
                ...conversationData,
                messages: [
                    {
                        sender: 'client',
                        message: conversationData.data.message || 'Demande initiale',
                        timestamp: new Date()
                    }
                ],
                status: 'open',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            };
            
            const docRef = await firebase.firestore().collection('conversations').add(conversation);
            
            if (typeof window !== 'undefined' && typeof window.DISCORD_BOT_DM_API === 'string' && window.DISCORD_BOT_DM_API && typeof window.DISCORD_CONFIG !== 'undefined' && window.DISCORD_CONFIG.notificationIds) {
                try {
                    const adminLink = `${window.location.origin}/admin.html#conversations`;
                    const messagePreview = (conversationData.data.message || 'Demande initiale').length > 100 ? 
                        (conversationData.data.message || 'Demande initiale').substring(0, 100) + '...' : 
                        (conversationData.data.message || 'Demande initiale');
                    const typeLabel = conversationData.type === 'contact' ? 'Contact' : 'Estimation';
                    const discordId = conversationData.data?.discordId || 'Non renseigné';
                    
                    console.log('[Notifications] Envoi aux admins:', window.DISCORD_CONFIG.notificationIds.length, 'admin(s)');
                    
                    window.DISCORD_CONFIG.notificationIds.forEach(adminId => {
                        const payload = {
                            discordId: adminId,
                            embed: {
                                title: `🆕 Nouvelle demande de ${typeLabel}`,
                                description: `Un nouveau client a créé une conversation.\n\n**Message:**\n${messagePreview}\n\n[🔗 **Voir la conversation**](${adminLink})`,
                                color: 0xE30613,
                                footer: {
                                    text: `ID Client: ${discordId} | Conv: ${docRef.id}`
                                },
                                timestamp: new Date().toISOString()
                            }
                        };
                        
                        const headers = { 'Content-Type': 'application/json' };
                        if (window.DISCORD_BOT_DM_TOKEN) {
                            headers['Authorization'] = `Bearer ${window.DISCORD_BOT_DM_TOKEN}`;
                        }
                        console.log('[Notifications] Envoi à l\'admin:', adminId);
                        fetch(window.DISCORD_BOT_DM_API, { method: 'POST', headers: headers, body: JSON.stringify(payload) })
                            .then(response => console.log('[Notifications] Réponse:', response.status))
                            .catch(err => console.error('[Notifications] Erreur:', err));
                    });
                } catch (e) {
                    console.error('Erreur notification admins:', e);
                }
            } else {
                console.log('[Notifications] Config manquante:', {
                    hasWindow: typeof window !== 'undefined',
                    hasAPI: typeof window.DISCORD_BOT_DM_API === 'string',
                    hasConfig: typeof window.DISCORD_CONFIG !== 'undefined',
                    hasNotificationIds: window.DISCORD_CONFIG?.notificationIds
                });
            }
            
            return { id: docRef.id, ...conversation };
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la conversation:', error);
            throw error;
        }
    },

    async addMessage(conversationId, sender, message, attachments = []) {
        try {
            const messageData = {
                sender: sender,
                message: message,
                timestamp: new Date(),
                attachments: attachments,
                read: false,
                readBy: []
            };
            
            await firebase.firestore().collection('conversations').doc(conversationId).update({
                messages: firebase.firestore.FieldValue.arrayUnion(messageData),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });

            console.log('[Notifications] Nouveau message -', 'Sender:', sender, 'ConvID:', conversationId);
            
            if (typeof window !== 'undefined' && typeof window.DISCORD_BOT_DM_API === 'string' && window.DISCORD_BOT_DM_API) {
                try {
                    const doc = await firebase.firestore().collection('conversations').doc(conversationId).get();
                    if (doc.exists) {
                        const data = doc.data();
                        const discordId = data && data.data ? data.data.discordId : null;
                        
                        console.log('[Notifications] Doc trouvé - DiscordID:', discordId, 'Sender:', sender);
                        
                        if (sender === 'admin' && discordId) {
                            console.log('[Notifications] Message admin -> envoi au client', discordId);
                            const dashboardLink = `${window.location.origin}/dashboard-client.html?conv=${encodeURIComponent(conversationId)}`;
                            
                            const payload = {
                                discordId: discordId,
                                embed: {
                                    title: '📬 Nouvelle réponse de ORPI',
                                    description: 'Vous avez reçu une nouvelle réponse à votre conversation.\n\n[🔗 **Ouvrir la conversation**]('+dashboardLink+')',
                                    color: 0x0099ff,
                                    footer: {
                                        text: `ID: ${conversationId}`
                                    },
                                    timestamp: new Date().toISOString()
                                },
                                attachments: Array.isArray(attachments) ? attachments.map(a => ({ name: a.name, url: a.url })) : []
                            };
                            
                            const headers = { 'Content-Type': 'application/json' };
                            if (window.DISCORD_BOT_DM_TOKEN) {
                                headers['Authorization'] = `Bearer ${window.DISCORD_BOT_DM_TOKEN}`;
                            }
                            fetch(window.DISCORD_BOT_DM_API, { method: 'POST', headers: headers, body: JSON.stringify(payload) }).catch(() => {});
                        } else if (sender === 'client' && typeof window.DISCORD_CONFIG !== 'undefined' && window.DISCORD_CONFIG.notificationIds) {
                            console.log('[Notifications] Message client détecté !');
                            console.log('[Notifications] DISCORD_CONFIG:', window.DISCORD_CONFIG);
                            console.log('[Notifications] Admins à notifier:', window.DISCORD_CONFIG.notificationIds);
                            
                            const adminLink = `${window.location.origin}/admin.html#conversations`;
                            const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;
                            
                            console.log('[Notifications] Message client - Envoi aux admins:', window.DISCORD_CONFIG.notificationIds.length);
                            
                            window.DISCORD_CONFIG.notificationIds.forEach(adminId => {
                                const payload = {
                                    discordId: adminId,
                                    embed: {
                                        title: '💬 Nouveau message client',
                                        description: `Un client a envoyé un message.\n\n**Message:**\n${messagePreview}\n\n[🔗 **Voir la conversation**](${adminLink})`,
                                        color: 0xE30613,
                                        footer: {
                                            text: `ID Client: ${discordId || 'Non renseigné'} | Conv: ${conversationId}`
                                        },
                                        timestamp: new Date().toISOString()
                                    },
                                    attachments: Array.isArray(attachments) ? attachments.map(a => ({ name: a.name, url: a.url })) : []
                                };
                                
                                const headers = { 'Content-Type': 'application/json' };
                                if (window.DISCORD_BOT_DM_TOKEN) {
                                    headers['Authorization'] = `Bearer ${window.DISCORD_BOT_DM_TOKEN}`;
                                }
                                console.log('[Notifications] Envoi à l\'admin:', adminId);
                                fetch(window.DISCORD_BOT_DM_API, { method: 'POST', headers: headers, body: JSON.stringify(payload) })
                                    .then(response => console.log('[Notifications] Réponse:', response.status))
                                    .catch(err => console.error('[Notifications] Erreur:', err));
                            });
                        } else {
                            console.log('[Notifications] Aucune notification envoyée - Raisons:', {
                                senderIsClient: sender === 'client',
                                senderIsAdmin: sender === 'admin',
                                hasDiscordConfig: typeof window.DISCORD_CONFIG !== 'undefined',
                                hasNotificationIds: window.DISCORD_CONFIG?.notificationIds,
                                hasClientDiscordId: !!discordId
                            });
                        }
                    }
                } catch (e) {
                    console.error('[Notifications] Erreur:', e);
                }
            } else {
                console.log('[Notifications] API Discord non disponible:', {
                    hasWindow: typeof window !== 'undefined',
                    hasAPI: typeof window.DISCORD_BOT_DM_API === 'string',
                    apiValue: window.DISCORD_BOT_DM_API
                });
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout du message:', error);
            throw error;
        }
    },

    async closeConversation(conversationId) {
        try {
            await firebase.firestore().collection('conversations').doc(conversationId).update({
                status: 'closed',
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur lors de la clôture de la conversation:', error);
            throw error;
        }
    },

    async reopenConversation(conversationId) {
        try {
            await firebase.firestore().collection('conversations').doc(conversationId).update({
                status: 'open',
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur lors de la réouverture de la conversation:', error);
            throw error;
        }
    },

    async archiveConversation(conversationId) {
        try {
            await firebase.firestore().collection('conversations').doc(conversationId).update({
                archived: true,
                archivedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur lors de l\'archivage de la conversation:', error);
            throw error;
        }
    },

    async unarchiveConversation(conversationId) {
        try {
            await firebase.firestore().collection('conversations').doc(conversationId).update({
                archived: false,
                archivedAt: null
            });
        } catch (error) {
            console.error('Erreur lors du désarchivage de la conversation:', error);
            throw error;
        }
    },

    async getAll() {
        try {
            const snapshot = await firebase.firestore()
                .collection('conversations')
                .orderBy('lastUpdated', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des conversations:', error);
            throw error;
        }
    },

    async getByDiscordId(discordId) {
        try {
            const snapshot = await firebase.firestore()
                .collection('conversations')
                .where('data.discordId', '==', discordId)
                .get();
            
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            conversations.sort((a, b) => {
                if (!a.lastUpdated || !b.lastUpdated) return 0;
                return b.lastUpdated.toDate() - a.lastUpdated.toDate();
            });
            
            return conversations;
        } catch (error) {
            console.error('Erreur lors de la récupération des conversations:', error);
            throw error;
        }
    },

    async markAsRead(conversationId) {
        try {
            await firebase.firestore().collection('conversations').doc(conversationId).update({
                read: true
            });
        } catch (error) {
            console.error('Erreur lors du marquage comme lu:', error);
            throw error;
        }
    },

    async markMessagesAsRead(conversationId, userId) {
        try {
            const conversationRef = firebase.firestore().collection('conversations').doc(conversationId);
            const doc = await conversationRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                const updatedMessages = data.messages.map(msg => {
                    if (!msg.readBy) {
                        msg.readBy = [];
                    }
                    if (!msg.readBy.includes(userId) && msg.sender !== userId) {
                        msg.readBy.push(userId);
                        msg.read = true;
                    }
                    return msg;
                });
                
                await conversationRef.update({
                    messages: updatedMessages
                });
            }
        } catch (error) {
            console.error('Erreur lors du marquage des messages comme lus:', error);
            throw error;
        }
    },

    async getUnreadCount(userId) {
        try {
            const snapshot = await firebase.firestore()
                .collection('conversations')
                .where('data.discordId', '==', userId)
                .get();
            
            let unreadCount = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.messages) {
                    data.messages.forEach(msg => {
                        if (msg.sender !== 'client' && (!msg.readBy || !msg.readBy.includes(userId))) {
                            unreadCount++;
                        }
                    });
                }
            });
            
            return unreadCount;
        } catch (error) {
            console.error('Erreur lors du comptage des messages non lus:', error);
            throw error;
        }
    },

    onSnapshot(callback) {
        return firebase.firestore()
            .collection('conversations')
            .orderBy('lastUpdated', 'desc')
            .onSnapshot(snapshot => {
                const conversations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(conversations);
            });
    },

    onConversationSnapshot(conversationId, callback) {
        return firebase.firestore()
            .collection('conversations')
            .doc(conversationId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    callback({ id: doc.id, ...doc.data() });
                }
            });
    }
};


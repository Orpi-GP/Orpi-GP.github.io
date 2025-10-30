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


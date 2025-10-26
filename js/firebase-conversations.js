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

    async addMessage(conversationId, sender, message) {
        try {
            await firebase.firestore().collection('conversations').doc(conversationId).update({
                messages: firebase.firestore.FieldValue.arrayUnion({
                    sender: sender,
                    message: message,
                    timestamp: new Date()
                }),
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


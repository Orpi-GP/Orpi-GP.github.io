const NotificationsManager = {
    collection: firebase.firestore().collection('notifications'),
    async add(notification) {
        try {
            const docRef = await this.collection.add({
                ...notification,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            return docRef.id;
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la notification:', error);
            throw error;
        }
    },
    async getAll() {
        try {
            const snapshot = await this.collection
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des notifications:', error);
            throw error;
        }
    },
    async getUnread() {
        try {
            const snapshot = await this.collection
                .where('read', '==', false)
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des notifications non lues:', error);
            throw error;
        }
    },
    async countUnread() {
        try {
            const snapshot = await this.collection
                .where('read', '==', false)
                .get();
            return snapshot.size;
        } catch (error) {
            console.error('Erreur lors du comptage des notifications:', error);
            return 0;
        }
    },
    async markAsRead(id) {
        try {
            await this.collection.doc(id).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur lors du marquage de la notification:', error);
            throw error;
        }
    },
    async markAllAsRead() {
        try {
            const snapshot = await this.collection
                .where('read', '==', false)
                .get();
            const batch = firebase.firestore().batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
        } catch (error) {
            console.error('Erreur lors du marquage de toutes les notifications:', error);
            throw error;
        }
    },
    async delete(id) {
        try {
            await this.collection.doc(id).delete();
        } catch (error) {
            console.error('Erreur lors de la suppression de la notification:', error);
            throw error;
        }
    },
    onSnapshot(callback) {
        return this.collection
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const notifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(notifications);
            });
    }
};

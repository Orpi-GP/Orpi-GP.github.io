class FirebasePropertyManager {
    constructor() {
        this.collection = COLLECTIONS.PROPERTIES;
        this.listeners = [];
    }
    async getAll() {
        try {
            const snapshot = await db.collection(this.collection)
                .orderBy('createdAt', 'desc')
                .get();
            const properties = [];
            snapshot.forEach(doc => {
                properties.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return properties;
        } catch (error) {
            console.error('Erreur lors de la récupération des biens:', error);
            return [];
        }
    }
    async getById(id) {
        try {
            const doc = await db.collection(this.collection).doc(id).get();
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération du bien:', error);
            return null;
        }
    }
    async add(property) {
        try {
            const newProperty = {
                ...property,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection(this.collection).add(newProperty);
            return {
                id: docRef.id,
                ...newProperty,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erreur lors de l\'ajout du bien:', error);
            throw error;
        }
    }
    async update(id, updatedProperty) {
        try {
            await db.collection(this.collection).doc(id).update({
                ...updatedProperty,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return await this.getById(id);
        } catch (error) {
            console.error('Erreur lors de la modification du bien:', error);
            throw error;
        }
    }
    async delete(id) {
        try {
            await db.collection(this.collection).doc(id).delete();
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du bien:', error);
            throw error;
        }
    }
    async count() {
        try {
            const snapshot = await db.collection(this.collection).get();
            return snapshot.size;
        } catch (error) {
            console.error('Erreur lors du comptage des biens:', error);
            return 0;
        }
    }
    onSnapshot(callback) {
        const unsubscribe = db.collection(this.collection)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const properties = [];
                snapshot.forEach(doc => {
                    properties.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(properties);
            }, error => {
                console.error('Erreur lors de l\'écoute des changements:', error);
            });
        this.listeners.push(unsubscribe);
        return unsubscribe;
    }
    stopListening() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
}
const propertyManager = new FirebasePropertyManager();
function convertImageToBase64(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(price);
}
function formatDate(dateString) {
    if (!dateString) return 'Date inconnue';
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

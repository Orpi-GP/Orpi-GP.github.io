const AvailabilityManager = {
    collection: 'availability',

    async addAvailability(availabilityData) {
        try {
            const availability = {
                ...availabilityData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection(this.collection).add(availability);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error adding availability:', error);
            return { success: false, error: error.message };
        }
    },

    async updateAvailability(availabilityId, data) {
        try {
            await db.collection(this.collection).doc(availabilityId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating availability:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteAvailability(availabilityId) {
        try {
            await db.collection(this.collection).doc(availabilityId).delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting availability:', error);
            return { success: false, error: error.message };
        }
    },

    async getAvailabilitiesByEmployee(employeeId) {
        try {
            const snapshot = await db.collection(this.collection)
                .where('employeeId', '==', employeeId)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting availabilities:', error);
            return [];
        }
    },

    async getAvailabilitiesByDate(date) {
        try {
            const dayOfWeek = new Date(date + 'T12:00:00').getDay();
            
            const snapshot = await db.collection(this.collection)
                .where('dayOfWeek', '==', dayOfWeek)
                .where('active', '==', true)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting availabilities by date:', error);
            return [];
        }
    },

    async getAllAvailabilities() {
        try {
            const snapshot = await db.collection(this.collection).get();
            
            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    if (a.employeeId !== b.employeeId) return a.employeeId.localeCompare(b.employeeId);
                    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                    return a.startTime.localeCompare(b.startTime);
                });
        } catch (error) {
            console.error('Error getting all availabilities:', error);
            return [];
        }
    },

    listenToAvailabilities(employeeId, callback) {
        let query = db.collection(this.collection);
        
        if (employeeId) {
            query = query.where('employeeId', '==', employeeId);
        }
        
        return query.onSnapshot(snapshot => {
            const availabilities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(availabilities);
        });
    },

    async updateAllEmployeeName(employeeId, newName) {
        try {
            const snapshot = await db.collection(this.collection)
                .where('employeeId', '==', employeeId)
                .get();
            
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { employeeName: newName });
            });
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('Error updating employee name:', error);
            return { success: false, error: error.message };
        }
    }
};

if (typeof window !== 'undefined') {
    window.AvailabilityManager = AvailabilityManager;
}


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
            
            const dateSnapshot = await db.collection(this.collection)
                .where('date', '==', date)
                .where('active', '==', true)
                .get();
            
            const dayOfWeekSnapshot = await db.collection(this.collection)
                .where('dayOfWeek', '==', dayOfWeek)
                .where('active', '==', true)
                .get();
            
            const availabilities = [];
            
            dateSnapshot.docs.forEach(doc => {
                availabilities.push({ id: doc.id, ...doc.data() });
            });
            
            dayOfWeekSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!availabilities.find(a => a.id === doc.id)) {
                    availabilities.push({ id: doc.id, ...data });
                }
            });
            
            return availabilities;
        } catch (error) {
            console.error('Error getting availabilities by date:', error);
            return [];
        }
    },

    async migrateOldAvailabilities(employeeId = null) {
        try {
            const firestore = typeof db !== 'undefined' ? db : firebase.firestore();
            let query = firestore.collection(this.collection);
            
            if (employeeId) {
                query = query.where('employeeId', '==', employeeId);
            }
            
            const snapshot = await query.get();
            
            const oldAvailabilities = snapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    return data.dayOfWeek !== undefined && !data.date;
                })
                .map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (oldAvailabilities.length === 0) {
                return { success: true, count: 0, message: 'Aucun créneau ancien format trouvé' };
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endDate = new Date(today);
            endDate.setMonth(endDate.getMonth() + 3);
            
            let createdCount = 0;
            const batch = firestore.batch();
            const maxBatchSize = 500;
            let batchOperations = 0;
            
            for (const oldAvail of oldAvailabilities) {
                let currentDate = new Date(today);
                
                while (currentDate <= endDate) {
                    if (currentDate.getDay() === oldAvail.dayOfWeek) {
                        if (batchOperations >= maxBatchSize) {
                            await batch.commit();
                            batchOperations = 0;
                        }
                        
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const newAvailRef = firestore.collection(this.collection).doc();
                        batch.set(newAvailRef, {
                            employeeId: oldAvail.employeeId,
                            employeeName: oldAvail.employeeName,
                            date: dateStr,
                            startTime: oldAvail.startTime,
                            endTime: oldAvail.endTime,
                            duration: oldAvail.duration,
                            active: oldAvail.active !== false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            migratedFrom: oldAvail.id
                        });
                        createdCount++;
                        batchOperations++;
                    }
                    const nextDate = new Date(currentDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    currentDate = nextDate;
                }
            }
            
            if (batchOperations > 0) {
                await batch.commit();
            }
            
            return { success: true, count: createdCount };
        } catch (error) {
            console.error('Error migrating availabilities:', error);
            return { success: false, error: error.message };
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
    },

    async deleteAllExceptPendingAppointments() {
        try {
            const firestore = typeof db !== 'undefined' ? db : firebase.firestore();
            
            console.log('Récupération des rendez-vous en attente...');
            const appointmentsSnapshot = await firestore.collection('appointments')
                .where('status', '==', 'pending')
                .get();
            
            const pendingAppointments = appointmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`${pendingAppointments.length} rendez-vous en attente trouvés`);
            
            const protectedSlots = new Set();
            pendingAppointments.forEach(apt => {
                if (apt.date && apt.time && apt.employeeId) {
                    const slotKey = `${apt.date}_${apt.time}_${apt.employeeId}`;
                    protectedSlots.add(slotKey);
                }
            });
            
            console.log(`${protectedSlots.size} créneaux protégés identifiés`);
            
            console.log('Récupération de tous les créneaux...');
            const allAvailabilitiesSnapshot = await firestore.collection(this.collection).get();
            const allAvailabilities = allAvailabilitiesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`${allAvailabilities.length} créneaux totaux trouvés`);
            
            const slotsToDelete = [];
            for (const avail of allAvailabilities) {
                let shouldProtect = false;
                
                if (avail.date && avail.startTime && avail.employeeId) {
                    const slotKey = `${avail.date}_${avail.startTime}_${avail.employeeId}`;
                    if (protectedSlots.has(slotKey)) {
                        shouldProtect = true;
                    }
                } else if (avail.dayOfWeek !== undefined && avail.startTime && avail.employeeId) {
                    for (const apt of pendingAppointments) {
                        if (!apt.date) continue;
                        const aptDate = new Date(apt.date + 'T12:00:00');
                        if (aptDate.getDay() === avail.dayOfWeek && 
                            apt.time === avail.startTime && 
                            apt.employeeId === avail.employeeId) {
                            shouldProtect = true;
                            break;
                        }
                    }
                }
                
                if (!shouldProtect) {
                    slotsToDelete.push(avail.id);
                }
            }
            
            console.log(`${slotsToDelete.length} créneaux à supprimer`);
            
            if (slotsToDelete.length === 0) {
                return { success: true, count: 0, message: 'Aucun créneau à supprimer' };
            }
            
            let batch = firestore.batch();
            const maxBatchSize = 500;
            let deletedCount = 0;
            
            for (let i = 0; i < slotsToDelete.length; i++) {
                if (i > 0 && i % maxBatchSize === 0) {
                    await batch.commit();
                    batch = firestore.batch();
                }
                
                const slotRef = firestore.collection(this.collection).doc(slotsToDelete[i]);
                batch.delete(slotRef);
                deletedCount++;
            }
            
            if (slotsToDelete.length % maxBatchSize !== 0 || slotsToDelete.length <= maxBatchSize) {
                await batch.commit();
            }
            
            console.log(`${deletedCount} créneaux supprimés avec succès`);
            
            return { success: true, count: deletedCount, protected: protectedSlots.size };
        } catch (error) {
            console.error('Error deleting availabilities:', error);
            return { success: false, error: error.message };
        }
    }
};

if (typeof window !== 'undefined') {
    window.AvailabilityManager = AvailabilityManager;
}


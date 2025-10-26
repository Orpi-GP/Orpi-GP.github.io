const AppointmentsManager = {
    collection: 'appointments',
    employeesCollection: 'employees',

    async createAppointment(appointmentData) {
        try {
            const appointment = {
                ...appointmentData,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: window.currentUser?.uid || 'anonymous'
            };

            const docRef = await db.collection(this.collection).add(appointment);

            await this.createNotification(appointment, docRef.id);

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error creating appointment:', error);
            return { success: false, error: error.message };
        }
    },

    async createNotification(appointment, appointmentId) {
        try {
            const notification = {
                type: 'appointment',
                title: 'Nouveau rendez-vous',
                message: `${appointment.clientName} a pris rendez-vous pour le ${appointment.date} à ${appointment.time}`,
                appointmentId: appointmentId,
                recipientId: appointment.employeeId,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('notifications').add(notification);
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    },

    async getAvailableSlots(date) {
        try {
            const dateObj = new Date(date + 'T12:00:00');
            const dayOfWeek = dateObj.getDay();
            const appointments = await this.getAppointmentsByDate(date);
            
            const availabilitiesSnapshot = await db.collection('availability')
                .where('dayOfWeek', '==', dayOfWeek)
                .where('active', '==', true)
                .get();
            
            const availabilities = availabilitiesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const slots = [];
            
            availabilities.forEach(availability => {
                const isBooked = appointments.some(apt => 
                    apt.time === availability.startTime && 
                    apt.employeeId === availability.employeeId
                );
                
                if (!isBooked) {
                    slots.push({
                        time: availability.startTime,
                        endTime: availability.endTime,
                        employeeId: availability.employeeId,
                        employeeName: availability.employeeName,
                        duration: availability.duration,
                        available: true
                    });
                }
            });

            slots.sort((a, b) => a.time.localeCompare(b.time));
            
            return slots;
        } catch (error) {
            console.error('Error getting available slots:', error);
            return [];
        }
    },

    async getActiveEmployees() {
        try {
            const snapshot = await db.collection(this.employeesCollection)
                .where('active', '==', true)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting employees:', error);
            return [];
        }
    },

    async getAppointmentsByDate(date) {
        try {
            const snapshot = await db.collection(this.collection)
                .where('date', '==', date)
                .get();
            
            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(apt => apt.status !== 'cancelled');
        } catch (error) {
            console.error('Error getting appointments:', error);
            return [];
        }
    },

    async getAppointmentsByEmployee(employeeId) {
        try {
            const snapshot = await db.collection(this.collection)
                .where('employeeId', '==', employeeId)
                .limit(50)
                .get();
            
            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    if (a.date !== b.date) return b.date.localeCompare(a.date);
                    return b.time.localeCompare(a.time);
                });
        } catch (error) {
            console.error('Error getting employee appointments:', error);
            return [];
        }
    },

    async updateAppointmentStatus(appointmentId, status) {
        try {
            await db.collection(this.collection).doc(appointmentId).update({
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating appointment:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteAppointment(appointmentId) {
        try {
            await db.collection(this.collection).doc(appointmentId).delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting appointment:', error);
            return { success: false, error: error.message };
        }
    },

    async getUpcomingAppointments() {
        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            const snapshot = await db.collection(this.collection)
                .where('date', '>=', todayStr)
                .get();
            
            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(apt => apt.status === 'pending')
                .sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return a.time.localeCompare(b.time);
                });
        } catch (error) {
            console.error('Error getting upcoming appointments:', error);
            return [];
        }
    },

    listenToAppointments(callback) {
        return db.collection(this.collection)
            .limit(100)
            .onSnapshot(snapshot => {
                const appointments = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .sort((a, b) => {
                        const timeA = a.createdAt?.toMillis() || 0;
                        const timeB = b.createdAt?.toMillis() || 0;
                        return timeB - timeA;
                    });
                callback(appointments);
            });
    }
};

if (typeof window !== 'undefined') {
    window.AppointmentsManager = AppointmentsManager;
}


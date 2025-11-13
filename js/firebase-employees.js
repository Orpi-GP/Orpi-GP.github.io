const employeesDB = {
    collection: 'employees',
    async add(employeeData) {
        try {
            const docRef = await firebase.firestore().collection(this.collection).add({
                ...employeeData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Employé ajouté avec ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'employé:', error);
            throw error;
        }
    },
    async getAll() {
        try {
            const snapshot = await firebase.firestore()
                .collection(this.collection)
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des employés:', error);
            throw error;
        }
    },
    async getById(id) {
        try {
            const doc = await firebase.firestore()
                .collection(this.collection)
                .doc(id)
                .get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'employé:', error);
            throw error;
        }
    },
    async update(id, employeeData) {
        try {
            await firebase.firestore()
                .collection(this.collection)
                .doc(id)
                .update({
                    ...employeeData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            console.log('Employé mis à jour:', id);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'employé:', error);
            throw error;
        }
    },
    async delete(id) {
        try {
            const salesSnapshot = await firebase.firestore()
                .collection('sales')
                .where('employeeId', '==', id)
                .get();
            const batch = firebase.firestore().batch();
            salesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            batch.delete(firebase.firestore().collection(this.collection).doc(id));
            await batch.commit();
            console.log('Employé et ses ventes supprimés:', id);
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'employé:', error);
            throw error;
        }
    },
    onSnapshot(callback) {
        return firebase.firestore()
            .collection(this.collection)
            .onSnapshot(snapshot => {
                const employees = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                employees.sort((a, b) => {
                    const orderA = a.order !== undefined && a.order !== null ? a.order : 999;
                    const orderB = b.order !== undefined && b.order !== null ? b.order : 999;
                    return orderA - orderB;
                });
                callback(employees);
            });
    },
    async getStats(employeeId) {
        try {
            const salesSnapshot = await firebase.firestore()
                .collection('sales')
                .where('employeeId', '==', employeeId)
                .get();
            let totalVentes = 0;
            let totalLocations = 0;
            let totalCA = 0;
            let totalBenefice = 0;
            let totalSalaire = 0;
            let totalEntrepriseRevenue = 0;
            salesSnapshot.docs.forEach(doc => {
                const sale = doc.data();
                if (sale.type === 'vente') {
                    totalVentes++;
                    totalCA += parseFloat(sale.prixMaison || 0);
                } else if (sale.type === 'location') {
                    totalLocations++;
                    totalCA += parseFloat(sale.prixLocation || 0);
                }
                totalBenefice += parseFloat(sale.benefice || 0);
                totalSalaire += parseFloat(sale.salaire || 0);
                totalEntrepriseRevenue += parseFloat(sale.entrepriseRevenue || 0);
            });
            return {
                totalVentes,
                totalLocations,
                totalCA,
                totalBenefice,
                totalSalaire,
                totalEntrepriseRevenue,
                nombreVentes: totalVentes + totalLocations
            };
        } catch (error) {
            console.error('Erreur lors du calcul des statistiques:', error);
            throw error;
        }
    }
};

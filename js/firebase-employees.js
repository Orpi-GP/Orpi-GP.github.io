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
            // Récupérer l'employé pour avoir son montant par vente et commission locations
            const employeeDoc = await firebase.firestore()
                .collection(this.collection)
                .doc(employeeId)
                .get();
            const employee = employeeDoc.exists ? employeeDoc.data() : null;
            const montantParVente = employee?.montantParVente || 3300;
            const commissionLocations = employee?.commission || 0;
            const SALAIRE_MAX = 150000;
            
            const salesSnapshot = await firebase.firestore()
                .collection('sales')
                .where('employeeId', '==', employeeId)
                .get();
            let totalVentes = 0;
            let totalLocations = 0;
            let totalCA = 0;
            let totalBenefice = 0;
            let totalEntrepriseRevenue = 0;
            let totalSalaire = 0;
            
            salesSnapshot.docs.forEach(doc => {
                const sale = doc.data();
                const entrepriseRevenue = parseFloat(sale.entrepriseRevenue || 0);
                totalEntrepriseRevenue += entrepriseRevenue;
                
                if (sale.type === 'vente') {
                    totalVentes++;
                    totalCA += parseFloat(sale.prixMaison || 0);
                    // Pour les ventes : montant fixe par vente
                    totalSalaire += montantParVente;
                } else if (sale.type === 'location') {
                    totalLocations++;
                    totalCA += parseFloat(sale.prixLocation || 0);
                    // Pour les locations : pourcentage sur le CA après 15%
                    totalSalaire += Math.min(entrepriseRevenue * (commissionLocations / 100), SALAIRE_MAX);
                }
            });
            
            // Recalculer le bénéfice total basé sur le nouveau salaire
            totalBenefice = totalEntrepriseRevenue - totalSalaire;
            
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

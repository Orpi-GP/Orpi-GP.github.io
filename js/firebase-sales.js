const salesDB = {
    collection: 'sales',
    async add(saleData) {
        try {
            const docRef = await firebase.firestore().collection(this.collection).add({
                ...saleData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Vente ajoutée avec ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la vente:', error);
            throw error;
        }
    },
    async getAll() {
        try {
            const snapshot = await firebase.firestore()
                .collection(this.collection)
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des ventes:', error);
            throw error;
        }
    },
    async getByEmployee(employeeId) {
        try {
            const snapshot = await firebase.firestore()
                .collection(this.collection)
                .where('employeeId', '==', employeeId)
                .get();
            const sales = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            sales.sort((a, b) => {
                if (!a.createdAt || !b.createdAt) return 0;
                return b.createdAt.toMillis() - a.createdAt.toMillis();
            });
            return sales;
        } catch (error) {
            console.error('Erreur lors de la récupération des ventes:', error);
            throw error;
        }
    },
    async update(id, saleData) {
        try {
            await firebase.firestore()
                .collection(this.collection)
                .doc(id)
                .update({
                    ...saleData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            console.log('Vente mise à jour:', id);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la vente:', error);
            throw error;
        }
    },
    async delete(id) {
        try {
            await firebase.firestore()
                .collection(this.collection)
                .doc(id)
                .delete();
            console.log('Vente supprimée:', id);
        } catch (error) {
            console.error('Erreur lors de la suppression de la vente:', error);
            throw error;
        }
    },
    onSnapshotByEmployee(employeeId, callback) {
        return firebase.firestore()
            .collection(this.collection)
            .where('employeeId', '==', employeeId)
            .onSnapshot(snapshot => {
                const sales = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                sales.sort((a, b) => {
                    if (!a.createdAt || !b.createdAt) return 0;
                    return b.createdAt.toMillis() - a.createdAt.toMillis();
                });
                callback(sales);
            });
    },
    calculateSaleStats(saleData, employeeCommission) {
        const prixMaison = parseFloat(saleData.prixMaison || 0);
        const prixLocation = parseFloat(saleData.prixLocation || 0);
        const commission = parseFloat(employeeCommission || 0);
        const SALAIRE_MAX = 150000;
        const ENTREPRISE_PERCENTAGE = 0.15;
        let totalCA = 0;
        let benefice = 0;
        let salaire = 0;
        let entrepriseRevenue = 0;
        if (saleData.type === 'vente') {
            totalCA = prixMaison;
            entrepriseRevenue = prixMaison * ENTREPRISE_PERCENTAGE;
            salaire = Math.min(entrepriseRevenue * (commission / 100), SALAIRE_MAX);
            benefice = entrepriseRevenue - salaire;
        } else if (saleData.type === 'location') {
            totalCA = prixLocation;
            entrepriseRevenue = prixLocation * ENTREPRISE_PERCENTAGE;
            salaire = Math.min(entrepriseRevenue * (commission / 100), SALAIRE_MAX);
            benefice = entrepriseRevenue - salaire;
        }
        return {
            totalCA,
            benefice,
            salaire,
            entrepriseRevenue
        };
    },
    async updateExistingSalesWithEntrepriseRevenue() {
        try {
            const snapshot = await firebase.firestore()
                .collection(this.collection)
                .get();
            const batch = firebase.firestore().batch();
            let updateCount = 0;
            snapshot.docs.forEach(doc => {
                const sale = doc.data();
                const prixMaison = parseFloat(sale.prixMaison || 0);
                const prixLocation = parseFloat(sale.prixLocation || 0);
                const commission = parseFloat(sale.commission || 0);
                const ENTREPRISE_PERCENTAGE = 0.15;
                const SALAIRE_MAX = 150000;
                let entrepriseRevenue = 0;
                let benefice = 0;
                let salaire = 0;
                if (sale.type === 'vente') {
                    entrepriseRevenue = prixMaison * ENTREPRISE_PERCENTAGE;
                    salaire = Math.min(entrepriseRevenue * (commission / 100), SALAIRE_MAX);
                    benefice = entrepriseRevenue - salaire;
                } else if (sale.type === 'location') {
                    entrepriseRevenue = prixLocation * ENTREPRISE_PERCENTAGE;
                    salaire = Math.min(entrepriseRevenue * (commission / 100), SALAIRE_MAX);
                    benefice = entrepriseRevenue - salaire;
                }
                const needsUpdate = 
                    sale.entrepriseRevenue === undefined || 
                    sale.entrepriseRevenue !== entrepriseRevenue ||
                    sale.benefice !== benefice ||
                    sale.salaire !== salaire;
                if (needsUpdate) {
                    batch.update(doc.ref, { 
                        entrepriseRevenue,
                        benefice,
                        salaire
                    });
                    updateCount++;
                }
            });
            if (updateCount > 0) {
                await batch.commit();
                console.log(`${updateCount} ventes mises à jour avec les nouveaux calculs`);
            } else {
                console.log('Toutes les ventes sont déjà à jour');
            }
            return { success: true, updated: updateCount };
        } catch (error) {
            console.error('Erreur lors de la mise à jour des ventes:', error);
            throw error;
        }
    }
};

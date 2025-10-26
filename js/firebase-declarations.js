const declarationsDB = {
    collection: 'declarations',
    async cloture(periodeName) {
        try {
            const batch = firebase.firestore().batch();
            const employeesSnapshot = await firebase.firestore()
                .collection('employees')
                .get();
            const salesSnapshot = await firebase.firestore()
                .collection('sales')
                .get();
            const salesByEmployee = {};
            const allSales = [];
            salesSnapshot.docs.forEach(doc => {
                const sale = { id: doc.id, ...doc.data() };
                allSales.push(sale);
                if (!salesByEmployee[sale.employeeId]) {
                    salesByEmployee[sale.employeeId] = [];
                }
                salesByEmployee[sale.employeeId].push(sale);
            });
            const employeesData = [];
            for (const empDoc of employeesSnapshot.docs) {
                const employee = { id: empDoc.id, ...empDoc.data() };
                const employeeSales = salesByEmployee[employee.id] || [];
                let totalVentes = 0;
                let totalLocations = 0;
                let totalCA = 0;
                let totalBenefice = 0;
                let totalSalaire = 0;
                employeeSales.forEach(sale => {
                    if (sale.type === 'vente') {
                        totalVentes++;
                        totalCA += parseFloat(sale.prixMaison || 0);
                    } else if (sale.type === 'location') {
                        totalLocations++;
                        totalCA += parseFloat(sale.prixLocation || 0);
                    }
                    totalBenefice += parseFloat(sale.benefice || 0);
                    totalSalaire += parseFloat(sale.salaire || 0);
                });
                employeesData.push({
                    employeeId: employee.id,
                    employeeName: employee.name,
                    employeeGrade: employee.grade,
                    commission: employee.commission,
                    totalVentes,
                    totalLocations,
                    nombreVentes: totalVentes + totalLocations,
                    totalCA,
                    totalBenefice,
                    totalSalaire,
                    sales: employeeSales
                });
            }
            const declarationRef = firebase.firestore().collection(this.collection).doc();
            batch.set(declarationRef, {
                periodeName: periodeName || `Déclaration ${new Date().toLocaleDateString('fr-FR')}`,
                clotureeAt: firebase.firestore.FieldValue.serverTimestamp(),
                employeesData: employeesData,
                totalEmployees: employeesData.length,
                totalVentes: employeesData.reduce((sum, emp) => sum + emp.totalVentes, 0),
                totalLocations: employeesData.reduce((sum, emp) => sum + emp.totalLocations, 0),
                totalCA: employeesData.reduce((sum, emp) => sum + emp.totalCA, 0),
                totalBenefice: employeesData.reduce((sum, emp) => sum + emp.totalBenefice, 0),
                totalSalaires: employeesData.reduce((sum, emp) => sum + emp.totalSalaire, 0)
            });
            salesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log('Déclaration clôturée avec succès:', declarationRef.id);
            return declarationRef.id;
        } catch (error) {
            console.error('Erreur lors de la clôture de la déclaration:', error);
            throw error;
        }
    },
    async getAll() {
        try {
            const snapshot = await firebase.firestore()
                .collection(this.collection)
                .orderBy('clotureeAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération des déclarations:', error);
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
            console.error('Erreur lors de la récupération de la déclaration:', error);
            throw error;
        }
    },
    async delete(id) {
        try {
            await firebase.firestore()
                .collection(this.collection)
                .doc(id)
                .delete();
            console.log('Déclaration supprimée:', id);
        } catch (error) {
            console.error('Erreur lors de la suppression de la déclaration:', error);
            throw error;
        }
    },
    async getByEmployee(employeeId) {
        try {
            const snapshot = await firebase.firestore()
                .collection(this.collection)
                .orderBy('clotureeAt', 'desc')
                .get();
            const declarations = [];
            snapshot.docs.forEach(doc => {
                const declaration = { id: doc.id, ...doc.data() };
                const employeeData = declaration.employeesData?.find(emp => emp.employeeId === employeeId);
                if (employeeData) {
                    declarations.push({
                        ...declaration,
                        employeeData
                    });
                }
            });
            return declarations;
        } catch (error) {
            console.error('Erreur lors de la récupération des déclarations de l\'employé:', error);
            throw error;
        }
    },
    onSnapshot(callback) {
        return firebase.firestore()
            .collection(this.collection)
            .orderBy('clotureeAt', 'desc')
            .onSnapshot(snapshot => {
                const declarations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(declarations);
            });
    }
};

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
                const montantParVente = employee.montantParVente || 3300;
                const commissionLocations = employee.commission || 0;
                const ENTREPRISE_PERCENTAGE = 0.15;
                const SALAIRE_MAX = 150000;
                
                let totalVentes = 0;
                let totalLocations = 0;
                let totalCA = 0;
                let totalBenefice = 0;
                let totalSalaire = 0;
                let totalEntrepriseRevenue = 0;
                
                employeeSales.forEach(sale => {
                    let entrepriseRevenue = 0;
                    let salaire = 0;
                    
                    if (sale.type === 'vente') {
                        totalVentes++;
                        const prixMaison = parseFloat(sale.prixMaison || 0);
                        totalCA += prixMaison;
                        entrepriseRevenue = prixMaison * ENTREPRISE_PERCENTAGE;
                        // Pour les ventes : montant fixe par vente
                        salaire = montantParVente;
                    } else if (sale.type === 'location') {
                        totalLocations++;
                        const prixLocation = parseFloat(sale.prixLocation || 0);
                        totalCA += prixLocation;
                        entrepriseRevenue = prixLocation * ENTREPRISE_PERCENTAGE;
                        // Pour les locations : pourcentage sur le CA après 15%
                        salaire = Math.min(entrepriseRevenue * (commissionLocations / 100), SALAIRE_MAX);
                    }
                    
                    const benefice = entrepriseRevenue - salaire;
                    totalBenefice += benefice;
                    totalSalaire += salaire;
                    totalEntrepriseRevenue += entrepriseRevenue;
                });
                
                employeesData.push({
                    employeeId: employee.id,
                    employeeName: employee.name,
                    employeeGrade: employee.grade,
                    commission: employee.commission,
                    montantParVente: montantParVente,
                    totalVentes,
                    totalLocations,
                    nombreVentes: totalVentes + totalLocations,
                    totalCA,
                    totalBenefice,
                    totalSalaire,
                    totalEntrepriseRevenue,
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
                totalSalaires: employeesData.reduce((sum, emp) => sum + emp.totalSalaire, 0),
                totalEntrepriseRevenue: employeesData.reduce((sum, emp) => sum + emp.totalEntrepriseRevenue, 0)
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
    },
    getDeclarationUrl(declarationId) {
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        
        if (hostname.includes('github.io')) {
            const parts = hostname.split('.');
            if (parts.length === 3 && parts[0] !== 'www') {
                return `${origin}/declaration-partage.html?id=${declarationId}`;
            }
            
            const pathname = window.location.pathname;
            const pathParts = pathname.split('/').filter(p => p && !p.includes('.'));
            const repoName = pathParts[0] || '';
            const baseUrl = repoName ? `${origin}/${repoName}` : origin;
            return `${baseUrl}/declaration-partage.html?id=${declarationId}`;
        }
        
        return `${origin}/declaration-partage.html?id=${declarationId}`;
    }
};

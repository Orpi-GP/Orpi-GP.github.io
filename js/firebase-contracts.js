const ContractsManager = {
    collection: firebase.firestore().collection('contracts'),

    async createContract(contractData) {
        try {
            const contractId = this.generateContractId();
            const contract = {
                id: contractId,
                ...contractData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending',
                signatures: {
                    admin: null,
                    client: null
                },
                signedAt: {
                    admin: null,
                    client: null
                }
            };

            await this.collection.doc(contractId).set(contract);
            return contractId;
        } catch (error) {
            console.error('Erreur création contrat:', error);
            throw error;
        }
    },

    async getContract(contractId) {
        try {
            const doc = await this.collection.doc(contractId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erreur récupération contrat:', error);
            throw error;
        }
    },

    async updateContract(contractId, data) {
        try {
            await this.collection.doc(contractId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur mise à jour contrat:', error);
            throw error;
        }
    },

    async signContract(contractId, signatureData, role) {
        try {
            const updateData = {
                [`signatures.${role}`]: signatureData,
                [`signedAt.${role}`]: firebase.firestore.FieldValue.serverTimestamp()
            };

            const contract = await this.getContract(contractId);
            const otherRole = role === 'admin' ? 'client' : 'admin';
            
            if (contract.signatures[otherRole]) {
                updateData.status = 'completed';
                updateData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
            } else {
                updateData.status = 'partially_signed';
            }

            await this.collection.doc(contractId).update(updateData);
        } catch (error) {
            console.error('Erreur signature contrat:', error);
            throw error;
        }
    },

    async getAllContracts() {
        try {
            const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur récupération contrats:', error);
            throw error;
        }
    },

    async deleteContract(contractId) {
        try {
            await this.collection.doc(contractId).delete();
        } catch (error) {
            console.error('Erreur suppression contrat:', error);
            throw error;
        }
    },

    onContractSnapshot(contractId, callback) {
        return this.collection.doc(contractId).onSnapshot(doc => {
            if (doc.exists) {
                callback({ id: doc.id, ...doc.data() });
            }
        });
    },

    onContractsSnapshot(callback) {
        return this.collection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(contracts);
        });
    },

    generateContractId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = 'CTR-';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    },

    getContractUrl(contractId) {
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        
        if (hostname.includes('github.io')) {
            const parts = hostname.split('.');
            if (parts.length === 3 && parts[0] !== 'www') {
                return `${origin}/contrat.html?id=${contractId}`;
            }
            
            const pathname = window.location.pathname;
            const pathParts = pathname.split('/').filter(p => p && !p.includes('.'));
            const repoName = pathParts[0] || '';
            const baseUrl = repoName ? `${origin}/${repoName}` : origin;
            return `${baseUrl}/contrat.html?id=${contractId}`;
        }
        
        return `${origin}/contrat.html?id=${contractId}`;
    }
};


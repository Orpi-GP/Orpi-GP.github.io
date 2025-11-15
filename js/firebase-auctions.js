const auctionsDB = {
    async createAuction(propertyId, propertyData, startingPrice, duration) {
        try {
            const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);
            
            const auctionData = {
                propertyId,
                propertyData,
                startingPrice: parseFloat(startingPrice),
                currentPrice: parseFloat(startingPrice),
                endTime: endTime.toISOString(),
                status: 'active',
                createdAt: new Date().toISOString(),
                bidsCount: 0,
                highestBidder: null
            };

            const docRef = await db.collection('auctions').add(auctionData);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Erreur création enchère:', error);
            return { success: false, error: error.message };
        }
    },

    async getActiveAuction() {
        try {
            const snapshot = await db.collection('auctions')
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Erreur récupération enchère active:', error);
            return null;
        }
    },

    async placeBid(auctionId, bidderName, bidAmount, discordUser = null) {
        try {
            const bidData = {
                auctionId,
                bidderName,
                bidAmount: parseFloat(bidAmount),
                timestamp: new Date().toISOString(),
                discordUser
            };

            await db.collection('bids').add(bidData);

            await db.collection('auctions').doc(auctionId).update({
                currentPrice: parseFloat(bidAmount),
                bidsCount: firebase.firestore.FieldValue.increment(1),
                highestBidder: bidderName
            });

            return { success: true };
        } catch (error) {
            console.error('Erreur placement enchère:', error);
            return { success: false, error: error.message };
        }
    },

    async getBids(auctionId) {
        try {
            const snapshot = await db.collection('bids')
                .where('auctionId', '==', auctionId)
                .orderBy('timestamp', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur récupération enchères:', error);
            return [];
        }
    },

    async closeAuction(auctionId) {
        try {
            await db.collection('auctions').doc(auctionId).update({
                status: 'closed',
                closedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            console.error('Erreur fermeture enchère:', error);
            return { success: false, error: error.message };
        }
    },

    listenToAuction(auctionId, callback) {
        return db.collection('auctions').doc(auctionId).onSnapshot(doc => {
            if (doc.exists) {
                callback({ id: doc.id, ...doc.data() });
            }
        });
    },

    listenToBids(auctionId, callback) {
        return db.collection('bids')
            .where('auctionId', '==', auctionId)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const bids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(bids);
            });
    },

    async getAllAuctions() {
        try {
            const snapshot = await db.collection('auctions')
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur récupération enchères:', error);
            return [];
        }
    },
    
    async getAuction(auctionId) {
        try {
            const doc = await db.collection('auctions').doc(auctionId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erreur récupération enchère:', error);
            return null;
        }
    },
    
    async deleteAuction(auctionId) {
        try {
            const batch = db.batch();
            
            const bidsSnapshot = await db.collection('bids')
                .where('auctionId', '==', auctionId)
                .get();
            
            bidsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            const auctionRef = db.collection('auctions').doc(auctionId);
            batch.delete(auctionRef);
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression enchère:', error);
            return { success: false, error: error.message };
        }
    }
};


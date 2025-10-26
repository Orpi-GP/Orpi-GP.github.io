const ReviewsManager = {
    collection: 'reviews',

    async createReview(reviewData) {
        try {
            const review = {
                ...reviewData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                published: true
            };

            const docRef = await db.collection(this.collection).add(review);

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error creating review:', error);
            return { success: false, error: error.message };
        }
    },

    async getAllReviews() {
        try {
            const snapshot = await db.collection(this.collection)
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting reviews:', error);
            return [];
        }
    },

    async getReviewsByRating(rating) {
        try {
            const snapshot = await db.collection(this.collection)
                .where('rating', '==', rating)
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting reviews by rating:', error);
            return [];
        }
    },

    listenToReviews(callback) {
        return db.collection(this.collection)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .onSnapshot(snapshot => {
                const reviews = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(reviews);
            });
    },

    async getStatistics() {
        try {
            const reviews = await this.getAllReviews();
            
            if (reviews.length === 0) {
                return {
                    total: 0,
                    average: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }

            const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let sum = 0;

            reviews.forEach(review => {
                distribution[review.rating]++;
                sum += review.rating;
            });

            return {
                total: reviews.length,
                average: (sum / reviews.length).toFixed(1),
                distribution
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                total: 0,
                average: 0,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
        }
    },

    async deleteReview(reviewId) {
        try {
            await db.collection(this.collection).doc(reviewId).delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting review:', error);
            return { success: false, error: error.message };
        }
    }
};


function getFirestore() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            return null;
        }
        if (!firebase.apps || firebase.apps.length === 0) {
            return null;
        }
        return firebase.firestore();
    } catch (error) {
        return null;
    }
}

async function getActiveTheme() {
    try {
        const firestore = getFirestore();
        if (!firestore) {
            return 'default';
        }
        const doc = await firestore.collection('site_settings').doc('theme').get();
        if (doc.exists) {
            return doc.data().activeTheme || 'default';
        }
        return 'default';
    } catch (error) {
        return 'default';
    }
}

async function setActiveTheme(themeName) {
    try {
        const firestore = getFirestore();
        if (!firestore) {
            return { success: false, error: 'Firebase non disponible' };
        }
        await firestore.collection('site_settings').doc('theme').set({
            activeTheme: themeName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'admin'
        });
        return { success: true };
    } catch (error) {
        console.error('Erreur sauvegarde thème:', error);
        return { success: false, error };
    }
}

function listenToThemeChanges(callback) {
    try {
        const firestore = getFirestore();
        if (!firestore) {
            return () => {};
        }
        return firestore.collection('site_settings').doc('theme').onSnapshot(doc => {
            if (doc.exists) {
                const theme = doc.data().activeTheme || 'default';
                callback(theme);
            }
        }, error => {
            console.error('Erreur écoute thème:', error);
        });
    } catch (error) {
        return () => {};
    }
}


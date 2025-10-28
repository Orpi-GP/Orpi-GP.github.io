async function getActiveTheme() {
    try {
        const doc = await db.collection('site_settings').doc('theme').get();
        if (doc.exists) {
            return doc.data().activeTheme || 'default';
        }
        return 'default';
    } catch (error) {
        console.error('Erreur chargement thème:', error);
        return 'default';
    }
}

async function setActiveTheme(themeName) {
    try {
        await db.collection('site_settings').doc('theme').set({
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
    return db.collection('site_settings').doc('theme').onSnapshot(doc => {
        if (doc.exists) {
            const theme = doc.data().activeTheme || 'default';
            callback(theme);
        }
    }, error => {
        console.error('Erreur écoute thème:', error);
    });
}


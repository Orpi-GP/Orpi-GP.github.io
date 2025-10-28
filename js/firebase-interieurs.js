async function addInterieur(interieurData) {
    try {
        const docRef = await db.collection('interieurs').add({
            ...interieurData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Intérieur ajouté avec l'ID:", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("❌ Erreur lors de l'ajout de l'intérieur:", error);
        return { success: false, error: error.message };
    }
}

async function getAllInterieurs() {
    try {
        const snapshot = await db.collection('interieurs')
            .orderBy('createdAt', 'desc')
            .get();
        
        const interieurs = [];
        snapshot.forEach(doc => {
            interieurs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return { success: true, data: interieurs };
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des intérieurs:", error);
        return { success: false, error: error.message, data: [] };
    }
}

async function getInterieurById(id) {
    try {
        const doc = await db.collection('interieurs').doc(id).get();
        
        if (!doc.exists) {
            return { success: false, error: "Intérieur non trouvé" };
        }
        
        return { 
            success: true, 
            data: {
                id: doc.id,
                ...doc.data()
            }
        };
    } catch (error) {
        console.error("❌ Erreur lors de la récupération de l'intérieur:", error);
        return { success: false, error: error.message };
    }
}

async function updateInterieur(id, interieurData) {
    try {
        await db.collection('interieurs').doc(id).update({
            ...interieurData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Intérieur mis à jour:", id);
        return { success: true };
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour de l'intérieur:", error);
        return { success: false, error: error.message };
    }
}

async function deleteInterieur(id) {
    try {
        await db.collection('interieurs').doc(id).delete();
        console.log("✅ Intérieur supprimé:", id);
        return { success: true };
    } catch (error) {
        console.error("❌ Erreur lors de la suppression de l'intérieur:", error);
        return { success: false, error: error.message };
    }
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function validateInterieurData(data) {
    const errors = [];
    
    if (!data.titre || data.titre.trim() === '') {
        errors.push("Le titre est requis");
    }
    
    if (!data.description || data.description.trim() === '') {
        errors.push("La description est requise");
    }
    
    if (!data.images || data.images.length === 0) {
        errors.push("Au moins une image est requise");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

const firebaseConfig = {
    apiKey: "AIzaSyAjammDWOEoYDtrg36e-rK8hzELaM0Pq4M",
    authDomain: "orpi-immo.firebaseapp.com",
    projectId: "orpi-immo",
    storageBucket: "orpi-immo.firebasestorage.app",
    messagingSenderId: "295996741529",
    appId: "1:295996741529:web:2a6421f008fae99bd7e508",
    measurementId: "G-0TZMR01RER"
  };
let app;
let db;
let appCheck;
try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
        appCheck = firebase.appCheck();
        appCheck.activate('6LclLvkrAAAAAJlXiPOxKrw-WfXFjiJPmohN3drz', true);
        console.log("🛡️ App Check activé");
    } else {
        console.log("⚠️ App Check désactivé en développement local");
    }
    
    console.log("✅ Firebase initialisé avec succès");
} catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Firebase:", error);
}
const COLLECTIONS = {
    PROPERTIES: 'properties',
    SETTINGS: 'settings'
};

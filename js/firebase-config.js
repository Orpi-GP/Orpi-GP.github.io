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

function initFirebase() {
    if (typeof firebase === 'undefined') {
        setTimeout(initFirebase, 50);
        return;
    }
    
    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        db = firebase.firestore();
    } catch (error) {
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
} else {
    initFirebase();
}
const COLLECTIONS = {
    PROPERTIES: 'properties',
    SETTINGS: 'settings'
};

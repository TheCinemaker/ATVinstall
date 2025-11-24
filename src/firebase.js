import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your actual Firebase config keys
const firebaseConfig = {
    apiKey: "AIzaSyDQawoLHujlY7y-yvS-maY7tmi3j-VChX4",
    authDomain: "atvinstall-846d2.firebaseapp.com",
    projectId: "atvinstall-846d2",
    storageBucket: "atvinstall-846d2.firebasestorage.app",
    messagingSenderId: "410670295012",
    appId: "1:410670295012:web:81bcd45858f57f29fd09f1",
    measurementId: "G-CJ9X7ZMWZL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable Offline Persistence
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.log('Persistence not supported by browser');
        }
    });
} catch (e) {
    console.log("Persistence init error", e);
}

export default app;

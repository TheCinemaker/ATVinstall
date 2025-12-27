import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, getFirestore } from "firebase/firestore";
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
// export const db = getFirestore(app); // Deprecated usage check

// Initialize Firestore with persistent cache
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

export const storage = getStorage(app);

export default app;

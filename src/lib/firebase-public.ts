import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration for the PUBLIC project
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
// Initialize Firebase
import { Firestore } from "firebase/firestore";

let app;
let db: Firestore;

const appName = "MIRYANG_CLIENT";
const existingApp = getApps().find(app => app.name === appName);

if (existingApp) {
    app = existingApp;
    db = getFirestore(app);
} else {
    app = initializeApp(firebaseConfig, appName);
    // Use initializeFirestore with experimentalForceLongPolling to prevent "client is offline" errors
    // in environments where WebSockets might be restricted or unreliable
    db = initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
    });
}

const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, db, storage };

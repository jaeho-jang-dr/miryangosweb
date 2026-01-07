
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// NOTE: In a real-world scenario with strict isolation, 
// this would use a DIFFERENT set of environment variables (e.g. NEXT_PUBLIC_CLINICAL_FIREBASE_...).
// For this MVP, we are logically separating the module to allow for easy migration later,
// but sharing the same physical project credentials as the Public CMS for now.

const clinicalFirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// We use a specific name 'clinical' to potentially distinguish the app instance if needed,
// though standard SDK behavior might singleton this. 
// Using the default app is safer for sharing Auth state if they are on the same project.
const app = getApps().find(app => app.name === '[DEFAULT]') || initializeApp(clinicalFirebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

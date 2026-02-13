import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const APP_NAME = "MIRYANG_EMR";

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

const existing = getApps().find((a) => a.name === APP_NAME);
if (existing) {
  app = existing;
  db = getFirestore(app);
} else {
  app = initializeApp(firebaseConfig, APP_NAME);
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
  });
}
auth = getAuth(app);
storage = getStorage(app);

export { app, auth, db, storage };

import { initializeApp, getApps, cert } from 'firebase-admin/app';

export function initAdmin() {
  if (getApps().length === 0) {
    // For Firebase Admin SDK, you need a service account key
    // In production, use environment variables
    // For now, we'll try to use the default credentials

    try {
      // Try to use service account from environment variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        // Fallback: use application default credentials (works in Firebase/GCP environments)
        initializeApp();
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      // Initialize without credentials for local development
      // Note: This will only work with Firebase Emulator
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
}

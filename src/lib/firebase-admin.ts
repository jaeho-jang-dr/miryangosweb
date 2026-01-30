import { initializeApp, getApps, cert } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

export function initAdmin() {
  if (getApps().length === 0) {
    try {
      let credential;

      // Try 1: Use service account from environment variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = cert(serviceAccount);
      }
      // Try 2: Use service account from file
      else {
        const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          credential = cert(serviceAccount);
        }
      }

      if (credential) {
        initializeApp({ credential });
        console.log('Firebase Admin initialized with service account');
      } else {
        // Fallback: use application default credentials (works in Firebase/GCP environments)
        initializeApp();
        console.log('Firebase Admin initialized with default credentials');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw new Error('Firebase Admin initialization failed. Please check your service account configuration.');
    }
  }
}

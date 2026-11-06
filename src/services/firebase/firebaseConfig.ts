import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  projectId?: string;
  authDomain?: string;
  missingKeys: string[];
  mode: 'live_firebase' | 'offline_demo';
}

/**
 * Validates whether actual Firebase environment variables have been supplied in .env
 */
export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();

  const missingKeys: string[] = [];

  if (!apiKey || apiKey === 'your_firebase_api_key_here' || apiKey.includes('placeholder')) {
    missingKeys.push('VITE_FIREBASE_API_KEY');
  }
  if (!projectId || projectId === 'carepath-demo') {
    missingKeys.push('VITE_FIREBASE_PROJECT_ID');
  }
  if (!authDomain || authDomain === 'carepath-demo.firebaseapp.com') {
    missingKeys.push('VITE_FIREBASE_AUTH_DOMAIN');
  }

  const isConfigured = missingKeys.length === 0;

  return {
    isConfigured,
    projectId: isConfigured ? projectId : undefined,
    authDomain: isConfigured ? authDomain : undefined,
    missingKeys,
    mode: isConfigured ? 'live_firebase' : 'offline_demo',
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

/**
 * Returns the initialized Firebase App instance, or null if configuration is incomplete.
 */
export function getFirebaseApp(): FirebaseApp | null {
  const status = getFirebaseConfigStatus();
  if (!status.isConfigured) {
    return null;
  }

  if (!appInstance) {
    try {
      if (getApps().length > 0) {
        appInstance = getApp();
      } else {
        appInstance = initializeApp({
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        });
      }
    } catch (err) {
      console.warn('CarePath: Failed to initialize Firebase App with supplied environment variables:', err);
      return null;
    }
  }

  return appInstance;
}

/**
 * Returns genuine Firebase Auth instance, or null when running in offline evaluation mode.
 */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!authInstance) {
    try {
      authInstance = getAuth(app);
    } catch (err) {
      console.warn('CarePath: Failed to initialize Firebase Auth:', err);
      return null;
    }
  }

  return authInstance;
}

/**
 * Returns genuine Cloud Firestore instance, or null when running in offline evaluation mode.
 */
export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!firestoreInstance) {
    try {
      firestoreInstance = getFirestore(app);
    } catch (err) {
      console.warn('CarePath: Failed to initialize Firebase Firestore:', err);
      return null;
    }
  }

  return firestoreInstance;
}

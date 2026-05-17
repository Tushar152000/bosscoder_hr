import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

function buildConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(buildConfig());
  return _app;
}

function lazy<T extends object>(factory: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const inst = factory();
      const value = (inst as Record<string | symbol, unknown>)[prop as string];
      return typeof value === 'function' ? value.bind(inst) : value;
    },
  });
}

export const auth: Auth = lazy(() => {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  _auth.useDeviceLanguage();
  return _auth;
});

export const db: Firestore = lazy(() => {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
});

export const storage: FirebaseStorage = lazy(() => {
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());
  return _storage;
});

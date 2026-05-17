import 'server-only';
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

let initialized = false;
function ensureInitialized() {
  if (initialized || getApps().length) {
    initialized = true;
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not set. Add the base64-encoded service account JSON to .env.local.'
    );
  }

  const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));

  admin.initializeApp({
    credential: admin.credential.cert({
      ...serviceAccount,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    }),
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
  });
  initialized = true;
}

// Lazy proxy: triggers initialization on first property access.
function lazy<T extends object>(factory: () => T): T {
  let cache: T | null = null;
  return new Proxy({} as T, {
    get(_, prop) {
      if (!cache) {
        ensureInitialized();
        cache = factory();
      }
      const value = (cache as Record<string | symbol, unknown>)[prop as string];
      return typeof value === 'function' ? value.bind(cache) : value;
    },
  });
}

export const adminAuth = lazy(() => admin.auth());
export const adminDb = lazy(() => admin.firestore());
export const adminStorage = lazy(() => admin.storage());
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export { admin };

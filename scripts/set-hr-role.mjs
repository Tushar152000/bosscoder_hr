/**
 * Promotes a user to the `hr` role.
 * Run from project root:
 *   node --env-file=.env.local scripts/set-hr-role.mjs
 */

import admin from 'firebase-admin';

const TARGET_EMAIL = 'divyam.dubey@bosscoderacademy.com';

const HR_ROLES = ['hr'];
const HR_PERMISSIONS = [
  'view_compensation',
  'view_personal_documents',
  'manage_employees',
  'manage_review_cycles',
  'manage_offer_letters',
  'view_audit_log',
];

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('❌  FIREBASE_SERVICE_ACCOUNT is not set in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({
    ...serviceAccount,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const auth = admin.auth();

// Find user by email in hr_users
const snap = await db
  .collection('hr_users')
  .where('email', '==', TARGET_EMAIL)
  .limit(1)
  .get();

if (snap.empty) {
  console.error(`❌  No hr_users document found for ${TARGET_EMAIL}`);
  console.error('    They need to sign in to the portal at least once first.');
  process.exit(1);
}

const doc = snap.docs[0];
const uid = doc.data().uid;
console.log(`Found user: ${TARGET_EMAIL} (uid: ${uid})`);
console.log(`Current roles: ${JSON.stringify(doc.data().roles)}`);

// Update Firestore
await doc.ref.update({
  roles: HR_ROLES,
  permissions: HR_PERMISSIONS,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
console.log('✓ Firestore updated');

// Sync Firebase Auth custom claims
await auth.setCustomUserClaims(uid, {
  hr: true,
  roles: HR_ROLES,
  perms: HR_PERMISSIONS,
});
console.log('✓ Firebase Auth claims synced');

console.log(`\nDone. ${TARGET_EMAIL} is now HR.\n`);
process.exit(0);

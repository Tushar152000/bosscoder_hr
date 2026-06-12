/**
 * One-shot migration: rename department "Sales BST" → "Sales" in hr_employees.
 *
 * Run:
 *   node --env-file=.env.local scripts/rename-sales-bst.mjs
 *
 * Dry-run:
 *   node --env-file=.env.local scripts/rename-sales-bst.mjs --dry-run
 */

import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.error('❌  FIREBASE_SERVICE_ACCOUNT not set'); process.exit(1); }

const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({
    ...serviceAccount,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

const snap = await db.collection('hr_employees').where('department', '==', 'Sales BST').get();

console.log(`Found ${snap.size} employee(s) with department "Sales BST"`);
if (DRY_RUN) { console.log('Dry run — no writes.'); process.exit(0); }

let batch = db.batch();
let ops = 0;
let total = 0;

for (const doc of snap.docs) {
  batch.update(doc.ref, { department: 'Sales', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  ops++;
  total++;
  if (ops === 450) { await batch.commit(); batch = db.batch(); ops = 0; }
}
if (ops > 0) await batch.commit();

console.log(`✓ Updated ${total} employee(s) → department: "Sales"`);
process.exit(0);

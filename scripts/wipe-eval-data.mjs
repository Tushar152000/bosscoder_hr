/**
 * One-shot script: wipes hr_review_cycles and hr_review_submissions from Firestore.
 * Run from project root:
 *   node --env-file=.env.local scripts/wipe-eval-data.mjs
 */

import admin from 'firebase-admin';

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
const COLLECTIONS = ['hr_review_cycles', 'hr_review_submissions'];

async function deleteCollection(colName) {
  const snap = await db.collection(colName).get();
  if (snap.empty) {
    console.log(`  ${colName}: 0 documents — nothing to delete.`);
    return 0;
  }

  const total = snap.docs.length;
  console.log(`  ${colName}: deleting ${total} document(s)…`);

  let batch = db.batch();
  let ops = 0;
  let deleted = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    ops++;
    deleted++;
    if (ops === 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`  ✓ ${colName}: ${deleted} document(s) deleted.`);
  return deleted;
}

console.log(`\nProject: ${serviceAccount.project_id}`);
console.log('Collections to wipe:', COLLECTIONS.join(', '));
console.log('─'.repeat(60));

let total = 0;
for (const col of COLLECTIONS) {
  total += await deleteCollection(col);
}

console.log('─'.repeat(60));
console.log(`Done. ${total} document(s) deleted in total.\n`);
process.exit(0);

/**
 * One-shot script: hard-deletes all hr_employees records whose linked hr_users
 * entry does NOT have a 'founder' or 'hr' role.
 *
 * Run from project root:
 *   node --env-file=.env.local scripts/wipe-non-privileged-employees.mjs
 *
 * Pass --dry-run to preview without deleting:
 *   node --env-file=.env.local scripts/wipe-non-privileged-employees.mjs --dry-run
 */

import admin from 'firebase-admin';
import readline from 'readline';

const DRY_RUN = process.argv.includes('--dry-run');

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

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });
}

console.log(`\nProject: ${serviceAccount.project_id}`);
if (DRY_RUN) console.log('Mode: DRY RUN (no data will be deleted)');
console.log('─'.repeat(60));

// Step 1: collect employeeIds that belong to founder/hr users
console.log('\nStep 1: reading hr_users for founder/hr roles…');
const usersSnap = await db.collection('hr_users').get();

const keepEmployeeIds = new Set();
for (const doc of usersSnap.docs) {
  const data = doc.data();
  const roles = Array.isArray(data.roles) ? data.roles : [];
  const isPrivileged = roles.includes('founder') || roles.includes('hr');
  if (isPrivileged && data.employeeId) {
    keepEmployeeIds.add(data.employeeId);
    console.log(`  KEEP  ${data.email}  [${roles.join(', ')}]  → employeeId: ${data.employeeId}`);
  }
}

if (keepEmployeeIds.size === 0) {
  console.error('\n❌  No founder/hr users found with linked employeeIds. Aborting to be safe.');
  process.exit(1);
}

// Step 2: read all hr_employees and split into keep vs delete
console.log('\nStep 2: reading hr_employees…');
const empSnap = await db.collection('hr_employees').get();

const toDelete = [];
const toKeep = [];

for (const doc of empSnap.docs) {
  const data = doc.data();
  const id = data.employeeId ?? doc.id;
  if (keepEmployeeIds.has(id)) {
    toKeep.push({ id, name: data.displayName, email: data.email });
  } else {
    toDelete.push({ ref: doc.ref, id, name: data.displayName, email: data.email });
  }
}

console.log('\n── Employees to KEEP ─────────────────────────────────');
toKeep.forEach((e) => console.log(`  ✓  ${e.name}  <${e.email}>`));

console.log('\n── Employees to DELETE ────────────────────────────────');
if (toDelete.length === 0) {
  console.log('  (none — nothing to delete)');
} else {
  toDelete.forEach((e) => console.log(`  ✗  ${e.name}  <${e.email}>`));
}

console.log('─'.repeat(60));
console.log(`Total: ${toKeep.length} kept, ${toDelete.length} to delete`);

if (toDelete.length === 0 || DRY_RUN) {
  console.log(DRY_RUN ? '\nDry run complete — no changes made.\n' : '\nNothing to delete.\n');
  process.exit(0);
}

// Step 3: confirm and delete
const answer = await confirm('\nType "yes" to permanently delete these records: ');
if (answer !== 'yes') {
  console.log('Aborted.\n');
  process.exit(0);
}

let batch = db.batch();
let ops = 0;
let deleted = 0;

for (const emp of toDelete) {
  batch.delete(emp.ref);
  ops++;
  deleted++;
  if (ops === 450) {
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }
}
if (ops > 0) await batch.commit();

console.log(`\n✓ Done. ${deleted} employee record(s) permanently deleted.\n`);
process.exit(0);

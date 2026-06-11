/**
 * One-off script: wipes all leave requests, leave balances, and
 * attendance records with status='leave' from Firestore.
 *
 * Usage:
 *   node scripts/clear-leave-data.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

// ── Load .env.local manually (no dotenv dep needed) ───────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}

// ── Init Firebase Admin ───────────────────────────────────────────────────────
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
const sa = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({
    ...sa,
    privateKey: sa.private_key.replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// ── Helper: delete every doc in a collection ──────────────────────────────────
async function deleteAll(collectionName) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) { console.log(`  ${collectionName}: already empty`); return 0; }
  const BATCH = 400;
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH).forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += Math.min(BATCH, snap.docs.length - i);
  }
  console.log(`  ${collectionName}: deleted ${deleted} docs`);
  return deleted;
}

// ── Helper: delete attendance records where status === 'leave' ─────────────────
async function deleteLeaveAttendanceRecords() {
  const snap = await db
    .collection('hr_attendance_records')
    .where('status', '==', 'leave')
    .get();
  if (snap.empty) { console.log('  hr_attendance_records (leave): already empty'); return 0; }
  const BATCH = 400;
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH).forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += Math.min(BATCH, snap.docs.length - i);
  }
  console.log(`  hr_attendance_records (leave): deleted ${deleted} docs`);
  return deleted;
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log('Clearing leave data...\n');
await deleteAll('hr_leave_requests');
await deleteAll('hr_leave_balances');
await deleteLeaveAttendanceRecords();
console.log('\nDone. All leave data cleared.');
process.exit(0);

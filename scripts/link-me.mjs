#!/usr/bin/env node
/**
 * One-off script: finds the hr_employees record matching the given email,
 * then links it to the hr_users document (sets userUid ↔ employeeId).
 * If no employee record exists it creates a minimal one.
 *
 * Usage:  node scripts/link-me.mjs
 */
import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── config ────────────────────────────────────────────────────────────────────
const USER_UID   = 'LtKPQBB3WdSatpSLvDIVcrieaxl1';
const USER_EMAIL = 'tushar.chauhan@bosscoderacademy.com';
const DISPLAY_NAME = 'Tushar Chauhan';
// ─────────────────────────────────────────────────────────────────────────────

// Parse .env.local to get FIREBASE_SERVICE_ACCOUNT
const env = readFileSync('.env.local', 'utf8');
const saB64 = env.match(/^FIREBASE_SERVICE_ACCOUNT=(.+)$/m)?.[1]?.trim();
if (!saB64) throw new Error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
const serviceAccount = JSON.parse(Buffer.from(saB64, 'base64').toString('utf8'));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function main() {
  const lowerEmail = USER_EMAIL.toLowerCase();

  // 1. Look for existing employee record by email
  const empSnap = await db
    .collection('hr_employees')
    .where('email', '==', lowerEmail)
    .limit(1)
    .get();

  let employeeId;

  if (!empSnap.empty) {
    const empDoc = empSnap.docs[0];
    const emp = empDoc.data();
    employeeId = emp.employeeId;
    console.log(`Found employee record: ${employeeId} (${emp.displayName})`);

    // Link userUid on the employee doc
    if (emp.userUid !== USER_UID) {
      await empDoc.ref.update({ userUid: USER_UID, updatedAt: FieldValue.serverTimestamp() });
      console.log('  ✓ Set userUid on hr_employees doc');
    } else {
      console.log('  · userUid already correct');
    }
  } else {
    // No employee record — create a minimal one
    const { nanoid } = await import('nanoid');
    employeeId = `EMP-${nanoid(6).toUpperCase()}`;
    const now = FieldValue.serverTimestamp();
    await db.collection('hr_employees').add({
      employeeId,
      userUid: USER_UID,
      displayName: DISPLAY_NAME,
      email: lowerEmail,
      personalEmail: null,
      phone: null,
      designation: 'HR',
      department: 'HR',
      managedDepartments: [],
      teamId: null,
      managerId: null,
      joiningDate: null,
      employmentType: 'full_time',
      status: 'active',
      active: true,
      exitDate: null,
      searchTokens: [],
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created new employee record: ${employeeId}`);
  }

  // 2. Link employeeId on the hr_users doc
  const userRef = db.collection('hr_users').doc(USER_UID);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error(`hr_users/${USER_UID} not found`);

  const userData = userSnap.data();
  if (userData.employeeId !== employeeId) {
    await userRef.update({ employeeId, updatedAt: FieldValue.serverTimestamp() });
    console.log(`  ✓ Set employeeId on hr_users doc: ${employeeId}`);
  } else {
    console.log('  · employeeId already correct');
  }

  console.log('\nDone. Sign out and sign back in to refresh your session.');
}

main().catch((e) => { console.error(e); process.exit(1); });
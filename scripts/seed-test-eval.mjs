/**
 * Creates a "Test" review cycle and enrolls ONLY specific emails into it.
 * Idempotent: re-running skips submissions that already exist for the cycle.
 *
 * Run from project root:
 *   node --env-file=.env.local scripts/seed-test-eval.mjs
 *
 * Dry-run (no writes):
 *   node --env-file=.env.local scripts/seed-test-eval.mjs --dry-run
 */

import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Config ────────────────────────────────────────────────────────────────────
const TARGET_EMAILS = [
  'website.tech@bosscoderacademy.com',
  'tech@bosscoderacademy.com',
];

const CYCLE_NAME  = 'Test Cycle - June 2026';
const CADENCE     = 'monthly';   // 'monthly' | 'quarterly'
const MONTH       = 6;           // June
const QUARTER     = null;
const YEAR        = 2026;
const DUE_DATE    = null;        // or e.g. new Date('2026-06-30')
// ─────────────────────────────────────────────────────────────────────────────

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.error('❌  FIREBASE_SERVICE_ACCOUNT not set'); process.exit(1); }

const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({
    ...serviceAccount,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
  }),
});

const db    = admin.firestore();
const FV    = admin.firestore.FieldValue;
const TS    = admin.firestore.Timestamp;

// Collection names — mirror src/lib/firebase/collections.ts
const COL_EMPLOYEES   = 'hr_employees';
const COL_CYCLES      = 'hr_review_cycles';
const COL_SUBMISSIONS = 'hr_review_submissions';

async function getEmployeeByEmail(email) {
  const snap = await db.collection(COL_EMPLOYEES).where('email', '==', email.toLowerCase()).limit(1).get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function getEmployeeById(id) {
  const doc = await db.collection(COL_EMPLOYEES).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function main() {
  console.log(`\nProject: ${serviceAccount.project_id}`);
  if (DRY_RUN) console.log('Mode: DRY RUN (no writes)\n');
  else console.log();

  // ── Step 1: Resolve target employees ──────────────────────────────────────
  console.log('Step 1: looking up target employees…');
  const employees = [];
  for (const email of TARGET_EMAILS) {
    const emp = await getEmployeeByEmail(email);
    if (!emp) {
      console.warn(`  WARN  No employee record found for <${email}> — skipping`);
    } else {
      employees.push(emp);
      console.log(`  ✓ ${emp.displayName} <${email}> → ${emp.employeeId}`);
    }
  }

  if (employees.length === 0) {
    console.error('\n❌  No matching employees found — nothing to do.');
    process.exit(1);
  }

  // ── Step 2: Create or reuse the test cycle ────────────────────────────────
  console.log('\nStep 2: checking for existing test cycle…');
  const existingSnap = await db.collection(COL_CYCLES).where('name', '==', CYCLE_NAME).limit(1).get();
  let cycleId;
  if (!existingSnap.empty) {
    cycleId = existingSnap.docs[0].data().cycleId;
    console.log(`  ✓ Reusing existing cycle "${CYCLE_NAME}" → ${cycleId}`);
  } else {
    if (DRY_RUN) {
      console.log(`  [dry-run] Would create cycle "${CYCLE_NAME}"`);
      cycleId = 'dry-run-cycle-id';
    } else {
      const ref = db.collection(COL_CYCLES).doc();
      cycleId = ref.id;
      await ref.set({
        cycleId,
        name: CYCLE_NAME,
        cadence: CADENCE,
        month: MONTH,
        quarter: QUARTER,
        year: YEAR,
        status: 'open',
        assignedAt: FV.serverTimestamp(),
        openedAt: FV.serverTimestamp(),
        closedAt: null,
        dueDate: DUE_DATE ? TS.fromDate(DUE_DATE) : null,
        selfCount: 0,
        managerCount: 0,
        selfSubmittedCount: 0,
        managerSubmittedCount: 0,
        createdBy: 'seed-test-eval-script',
        createdAt: FV.serverTimestamp(),
        updatedAt: FV.serverTimestamp(),
      });
      console.log(`  ✓ Created cycle "${CYCLE_NAME}" → ${cycleId}`);
    }
  }

  // ── Step 3: Check existing submissions for this cycle ─────────────────────
  console.log('\nStep 3: checking existing submissions…');
  const existingSubSnap = await db.collection(COL_SUBMISSIONS).where('cycleId', '==', cycleId).get();
  const existingSelf    = new Set();
  const existingMgr     = new Set();
  for (const d of existingSubSnap.docs) {
    const s = d.data();
    if (s.kind === 'self')    existingSelf.add(s.subjectEmployeeId);
    else                       existingMgr.add(`${s.subjectEmployeeId}::${s.reviewerEmployeeId ?? 'none'}`);
  }
  console.log(`  ${existingSubSnap.size} existing submission(s) for this cycle`);

  // ── Step 4: Build submissions ──────────────────────────────────────────────
  console.log('\nStep 4: creating submissions…\n');
  const batch = db.batch();
  let ops = 0;
  let selfCreated = 0, mgrCreated = 0;

  for (const emp of employees) {
    const empId = emp.employeeId;

    // Self-eval
    if (existingSelf.has(empId)) {
      console.log(`  SKIP  Self-eval already exists for ${emp.displayName}`);
    } else {
      if (!DRY_RUN) {
        const ref = db.collection(COL_SUBMISSIONS).doc();
        batch.set(ref, {
          submissionId: ref.id,
          cycleId,
          cycleName: CYCLE_NAME,
          kind: 'self',
          subjectEmployeeId: empId,
          subjectName: emp.displayName,
          subjectEmail: emp.email,
          subjectDepartment: emp.department ?? '',
          reviewerUid: emp.userUid ?? null,
          reviewerEmployeeId: empId,
          reviewerEmail: emp.email,
          reviewerName: emp.displayName,
          status: 'not-started',
          selfAnswers: null,
          selfRatings: null,
          managerRatings: null,
          managerOverallRating: null,
          managerNotes: null,
          submittedAt: null,
          lockedAt: null,
          createdAt: FV.serverTimestamp(),
          updatedAt: FV.serverTimestamp(),
        });
        ops++; selfCreated++;
      }
      console.log(`  CREATE  self-eval  → ${emp.displayName} <${emp.email}>`);
    }

    // Manager-eval (only if the employee has a manager in the system)
    if (emp.managerId) {
      const mgr = await getEmployeeById(emp.managerId);
      if (mgr) {
        const key = `${empId}::${mgr.employeeId}`;
        if (existingMgr.has(key)) {
          console.log(`  SKIP  Manager-eval already exists for ${emp.displayName}`);
        } else {
          if (!DRY_RUN) {
            const ref = db.collection(COL_SUBMISSIONS).doc();
            batch.set(ref, {
              submissionId: ref.id,
              cycleId,
              cycleName: CYCLE_NAME,
              kind: 'manager',
              subjectEmployeeId: empId,
              subjectName: emp.displayName,
              subjectEmail: emp.email,
              subjectDepartment: emp.department ?? '',
              reviewerUid: mgr.userUid ?? null,
              reviewerEmployeeId: mgr.employeeId,
              reviewerEmail: mgr.email,
              reviewerName: mgr.displayName,
              status: 'not-started',
              selfAnswers: null,
              selfRatings: null,
              managerRatings: null,
              managerOverallRating: null,
              managerNotes: null,
              submittedAt: null,
              lockedAt: null,
              createdAt: FV.serverTimestamp(),
              updatedAt: FV.serverTimestamp(),
            });
            ops++; mgrCreated++;
          }
          console.log(`  CREATE  manager-eval → ${emp.displayName} (reviewer: ${mgr.displayName} <${mgr.email}>)`);
        }
      } else {
        console.log(`  NOTE  ${emp.displayName} has managerId but manager record not found — skipping manager-eval`);
      }
    } else {
      console.log(`  NOTE  ${emp.displayName} has no manager — no manager-eval created`);
    }
  }

  // ── Step 5: Commit ─────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log(`Self-evals to create:    ${selfCreated}`);
  console.log(`Manager-evals to create: ${mgrCreated}`);

  if (ops === 0 || DRY_RUN) {
    console.log(DRY_RUN ? '\nDry run complete.\n' : '\nAll submissions already existed — nothing written.\n');
    process.exit(0);
  }

  // Update cycle counts
  await db.collection(COL_CYCLES).doc(cycleId).update({
    selfCount: FV.increment(selfCreated),
    managerCount: FV.increment(mgrCreated),
    updatedAt: FV.serverTimestamp(),
  });

  await batch.commit();
  console.log(`\n✓ Done. ${ops} submission(s) created in cycle "${CYCLE_NAME}".\n`);

  console.log('Next steps:');
  console.log('  1. Log in as website.tech@bosscoderacademy.com → go to /performance → you should see the self-eval form');
  console.log('  2. Log in as tech@bosscoderacademy.com → same flow');
  console.log('  3. To delete this test cycle later, wipe all docs where cycleId ==', cycleId, '\n');

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

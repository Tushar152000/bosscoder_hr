/**
 * One-shot script: imports Marketing department employees into hr_employees.
 * Skips any email that already exists. Resolves manager IDs from E-numbers
 * against Rajat Garg's live Firestore record.
 *
 * Run from project root:
 *   node --env-file=.env.local scripts/import-marketing-employees.mjs
 *
 * Dry-run (preview only, no writes):
 *   node --env-file=.env.local scripts/import-marketing-employees.mjs --dry-run
 */

import admin from 'firebase-admin';

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
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

// ── employee data ────────────────────────────────────────────────────────────
// managerRef: 'E1' = Rajat Garg (resolved live from Firestore)
const EMPLOYEES = [
  // Direct reports to Rajat (E1) — create first
  { ref: 'E200',  displayName: 'Aditya Kukreja',       email: 'aditya.kukreja@bosscoderacademy.com',       designation: 'Senior Marketing Executive',        department: 'Marketing', managerRef: 'E1',    joiningDate: '2022-12-20' },
  { ref: 'E7011', displayName: 'Shruti Srivastava',     email: 'shruti.srivastava@bosscoderacademy.com',    designation: 'Senior Marketing Executive',        department: 'Marketing', managerRef: 'E1',    joiningDate: '2024-09-02' },
  { ref: 'E7923', displayName: 'Sakshi Sahu',           email: 'sakshi.sahu@bosscoderacademy.com',          designation: 'Senior Marketing Executive',        department: 'Marketing', managerRef: 'E1',    joiningDate: '2024-12-23' },
  { ref: 'E317',  displayName: 'Divyanshi Kapoor',      email: 'divyanshi.kapoor@bosscoderacademy.com',     designation: 'Marketing Executive',               department: 'Marketing', managerRef: 'E1',    joiningDate: '2025-11-10' },
  { ref: 'E199',  displayName: 'Ibrar Ali',             email: 'ibrar.ali@bosscoderacademy.com',            designation: 'Product Manager',                   department: 'Marketing', managerRef: 'E1',    joiningDate: '2026-01-30' },
  // Reports to E199 (Ibrar Ali)
  { ref: 'E8002', displayName: 'Shreya Bharara',        email: 'shreya.bharara@bosscoderacademy.com',       designation: 'Marketing Executive',               department: 'Marketing', managerRef: 'E199',  joiningDate: '2025-06-02' },
  { ref: 'E8040', displayName: 'Vikrant Singh',         email: 'vikrant.singh@bosscoderacademy.com',        designation: 'Marketing Executive',               department: 'Marketing', managerRef: 'E199',  joiningDate: '2024-12-10' },
  { ref: 'E9429', displayName: 'Divyanjali Chaudhary',  email: 'divyanjali.chaudhary@bosscoderacademy.com', designation: 'Marketing Specialist',              department: 'Marketing', managerRef: 'E199',  joiningDate: '2026-02-16' },
  // Reports to E200 (Aditya Kukreja)
  { ref: 'E9323', displayName: 'Srishti Singh',         email: 'srishti.singh@bosscoderacademy.com',        designation: 'Marketing Specialist',              department: 'Marketing', managerRef: 'E200',  joiningDate: '2026-01-08' },
  { ref: 'E9430', displayName: 'Shailja Tripathi',      email: 'shailja.tripathi@bosscoderacademy.com',     designation: 'Marketing Specialist',              department: 'Marketing', managerRef: 'E200',  joiningDate: '2026-02-16' },
  // Reports to E7923 (Sakshi Sahu)
  { ref: 'E8007', displayName: 'Raghav Arora',          email: 'raghav.arora@bosscoderacademy.com',         designation: 'Marketing Executive',               department: 'Marketing', managerRef: 'E7923', joiningDate: '2025-06-10' },
  { ref: 'E9463', displayName: 'Archita Patwal',        email: 'archita.patwal@bosscoderacademy.com',       designation: 'Performance Marketing Specialist',  department: 'Marketing', managerRef: 'E7923', joiningDate: '2026-04-27' },
];

function buildSearchTokens(displayName, email, designation, department) {
  const blob = `${displayName} ${email} ${designation} ${department}`.toLowerCase();
  const words = blob.split(/[\s,@.]+/).filter(Boolean);
  const tokens = new Set();
  for (const w of words) {
    for (let i = 1; i <= Math.min(w.length, 20); i++) tokens.add(w.slice(0, i));
  }
  return [...tokens];
}

async function main() {
  console.log(`\nProject: ${serviceAccount.project_id}`);
  if (DRY_RUN) console.log('Mode: DRY RUN (no writes)');
  console.log('─'.repeat(60));

  // 1. Resolve Rajat Garg → Firestore employeeId, auto-creating if missing
  console.log('\nStep 1: resolving Rajat Garg (founder) in hr_employees…');
  const rajatSnap = await db
    .collection('hr_employees')
    .where('email', '==', 'rajat.garg@bosscoderacademy.com')
    .limit(1)
    .get();

  let rajatFirestoreId;

  if (!rajatSnap.empty) {
    rajatFirestoreId = rajatSnap.docs[0].data().employeeId;
    console.log(`  ✓ Found Rajat Garg → employeeId: ${rajatFirestoreId}`);
  } else {
    console.log('  ℹ  Not found — creating Rajat Garg as founder…');
    const ref = db.collection('hr_employees').doc();
    rajatFirestoreId = ref.id;
    const now = FieldValue.serverTimestamp();
    const rajatDoc = {
      employeeId: rajatFirestoreId,
      userUid: null,
      displayName: 'Rajat Garg',
      email: 'rajat.garg@bosscoderacademy.com',
      personalEmail: null,
      phone: null,
      designation: 'Founder',
      department: 'Leadership',
      managedDepartments: [],
      teamId: null,
      managerId: null,
      joiningDate: Timestamp.fromDate(new Date('2020-01-01')),
      employmentType: 'full-time',
      status: 'active',
      exitDate: null,
      active: true,
      searchTokens: buildSearchTokens('Rajat Garg', 'rajat.garg@bosscoderacademy.com', 'Founder', 'Leadership'),
      compensation: { ctc: null, salary: null, bonus: null },
      bank: { accountNumber: null, ifsc: null, beneficiaryName: null },
      identity: { pan: null, aadhaar: null },
      address: { line1: null, line2: null, city: null, state: null, pincode: null },
      dob: null,
      dateOfBirth: null,
      emergencyContact: { name: null, phone: null },
      createdAt: now,
      updatedAt: now,
      createdBy: 'import-script',
      updatedBy: 'import-script',
    };
    if (!DRY_RUN) await ref.set(rajatDoc);
    console.log(`  ✓ Created Rajat Garg → employeeId: ${rajatFirestoreId}`);
  }

  // Ensure Manish Garg (co-founder) also has an employee record
  console.log('\nStep 1b: resolving Manish Garg (co-founder) in hr_employees…');
  const manishSnap = await db
    .collection('hr_employees')
    .where('email', '==', 'manish.garg@bosscoderacademy.com')
    .limit(1)
    .get();

  if (!manishSnap.empty) {
    console.log(`  ✓ Found Manish Garg → employeeId: ${manishSnap.docs[0].data().employeeId}`);
  } else {
    console.log('  ℹ  Not found — creating Manish Garg as co-founder…');
    const ref = db.collection('hr_employees').doc();
    const now = FieldValue.serverTimestamp();
    const manishDoc = {
      employeeId: ref.id,
      userUid: null,
      displayName: 'Manish Garg',
      email: 'manish.garg@bosscoderacademy.com',
      personalEmail: null,
      phone: null,
      designation: 'Co-Founder',
      department: 'Leadership',
      managedDepartments: [],
      teamId: null,
      managerId: null,
      joiningDate: Timestamp.fromDate(new Date('2020-01-01')),
      employmentType: 'full-time',
      status: 'active',
      exitDate: null,
      active: true,
      searchTokens: buildSearchTokens('Manish Garg', 'manish.garg@bosscoderacademy.com', 'Co-Founder', 'Leadership'),
      compensation: { ctc: null, salary: null, bonus: null },
      bank: { accountNumber: null, ifsc: null, beneficiaryName: null },
      identity: { pan: null, aadhaar: null },
      address: { line1: null, line2: null, city: null, state: null, pincode: null },
      dob: null,
      dateOfBirth: null,
      emergencyContact: { name: null, phone: null },
      createdAt: now,
      updatedAt: now,
      createdBy: 'import-script',
      updatedBy: 'import-script',
    };
    if (!DRY_RUN) await ref.set(manishDoc);
    console.log(`  ✓ Created Manish Garg → employeeId: ${ref.id}`);
  }

  // E-number → Firestore employeeId map; E1 = Rajat
  const idMap = { E1: rajatFirestoreId };

  // 2. Check which emails already exist
  console.log('\nStep 2: checking for existing records…');
  const existingSnap = await db.collection('hr_employees').get();
  const existingEmails = new Set(existingSnap.docs.map((d) => d.data().email?.toLowerCase()));

  // 3. Process in the order already sorted (managers before reports)
  console.log('\nStep 3: preparing records…\n');

  const toCreate = [];
  const skipped = [];

  for (const emp of EMPLOYEES) {
    const email = emp.email.toLowerCase();
    if (existingEmails.has(email)) {
      skipped.push(emp);
      // Still need to add to idMap in case others reference this emp as manager
      const existing = existingSnap.docs.find((d) => d.data().email === email);
      if (existing) idMap[emp.ref] = existing.data().employeeId;
      console.log(`  SKIP  ${emp.displayName} <${email}> (already exists)`);
      continue;
    }

    const managerId = emp.managerRef ? (idMap[emp.managerRef] ?? null) : null;
    if (emp.managerRef && !idMap[emp.managerRef]) {
      console.warn(`  WARN  ${emp.displayName}: managerRef ${emp.managerRef} not resolved — managerId will be null`);
    }

    const ref = db.collection('hr_employees').doc();
    idMap[emp.ref] = ref.id;

    const joiningTs = Timestamp.fromDate(new Date(emp.joiningDate));
    const doc = {
      employeeId: ref.id,
      userUid: null,
      displayName: emp.displayName,
      email,
      personalEmail: null,
      phone: null,
      designation: emp.designation,
      department: emp.department,
      managedDepartments: [],
      teamId: null,
      managerId,
      joiningDate: joiningTs,
      employmentType: 'full-time',
      status: 'active',
      exitDate: null,
      active: true,
      searchTokens: buildSearchTokens(emp.displayName, email, emp.designation, emp.department),
      compensation: { ctc: null, salary: null, bonus: null },
      bank: { accountNumber: null, ifsc: null, beneficiaryName: null },
      identity: { pan: null, aadhaar: null },
      address: { line1: null, line2: null, city: null, state: null, pincode: null },
      dob: null,
      dateOfBirth: null,
      emergencyContact: { name: null, phone: null },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'import-script',
      updatedBy: 'import-script',
    };

    toCreate.push({ ref, doc, emp });
    const mgrName = emp.managerRef === 'E1' ? 'Rajat Garg' : EMPLOYEES.find(e => e.ref === emp.managerRef)?.displayName ?? emp.managerRef;
    console.log(`  CREATE  ${emp.displayName} <${email}>`);
    console.log(`          ${emp.designation} · ${emp.department} · manager: ${mgrName}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`${toCreate.length} to create, ${skipped.length} skipped (already exist)`);

  if (toCreate.length === 0 || DRY_RUN) {
    console.log(DRY_RUN ? '\nDry run complete — no writes made.\n' : '\nNothing to create.\n');
    process.exit(0);
  }

  // 4. Write in batches
  console.log('\nWriting to Firestore…');
  let batch = db.batch();
  let ops = 0;
  let created = 0;

  for (const { ref, doc } of toCreate) {
    batch.set(ref, doc);
    ops++;
    created++;
    if (ops === 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`\n✓ Done. ${created} Marketing employee(s) created.\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * One-shot script: imports Operations department employees into hr_employees.
 * Skips any email that already exists.
 *
 * Prereq: run import-marketing-employees.mjs first (creates Ibrar Ali / Manish Garg).
 *
 * Run from project root:
 *   node --env-file=.env.local scripts/import-operations-employees.mjs
 *
 * Dry-run:
 *   node --env-file=.env.local scripts/import-operations-employees.mjs --dry-run
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

// ── employee data (topological order: managers before their reports) ──────────
const EMPLOYEES = [
  // Direct reports to E2 (Manish Garg) — create first as they manage others
  { ref: 'E584',  displayName: 'Madhu Sikhwal',     email: 'madhu.sikhwal@bosscoderacademy.com',      designation: 'Senior Operations Manager', department: 'Operations', managerRef: 'E2',    joiningDate: '2023-12-07', employmentType: 'full-time' },
  { ref: 'E5591', displayName: 'Nandani Mittal',     email: 'nandani.mittal@bosscoderacademy.com',     designation: 'Operations Manager',        department: 'Operations', managerRef: 'E2',    joiningDate: '2024-07-24', employmentType: 'full-time' },
  { ref: 'E1130', displayName: 'Riya Gupta',         email: 'riya.gupta@bosscoderacademy.com',          designation: 'Product Manager',           department: 'Operations', managerRef: 'E2',    joiningDate: '2024-05-30', employmentType: 'full-time' },
  // Reports to E584 (Madhu Sikhwal)
  { ref: 'E1131', displayName: 'Adarsh Somvanshi',   email: 'adarsh.somvanshi@bosscoderacademy.com',   designation: 'Operations Lead',           department: 'Operations', managerRef: 'E584',  joiningDate: '2024-05-30', employmentType: 'full-time' },
  { ref: 'E5577', displayName: 'Rachit Dixit',       email: 'rachit.dixit@bosscoderacademy.com',       designation: 'Operations Lead',           department: 'Operations', managerRef: 'E584',  joiningDate: '2024-06-19', employmentType: 'full-time' },
  { ref: 'E1019', displayName: 'Satyavrat Saini',    email: 'satyavrat.saini@bosscoderacademy.com',    designation: 'Operations Associate',      department: 'Operations', managerRef: 'E584',  joiningDate: '2024-01-05', employmentType: 'full-time' },
  { ref: 'E7014', displayName: 'Yashika',            email: 'yashika@bosscoderacademy.com',            designation: 'Operations Executive',      department: 'Operations', managerRef: 'E584',  joiningDate: '2024-09-09', employmentType: 'full-time' },
  { ref: 'E7080', displayName: 'Manish Das',         email: 'manish.das@bosscoderacademy.com',         designation: 'Operations Executive',      department: 'Operations', managerRef: 'E584',  joiningDate: '2024-11-18', employmentType: 'full-time' },
  { ref: 'E7945', displayName: 'Shubham Tokas',      email: 'shubham.tokas@bosscoderacademy.com',      designation: 'Operations Associate',      department: 'Operations', managerRef: 'E584',  joiningDate: '2025-02-10', employmentType: 'full-time' },
  { ref: 'E7953', displayName: 'Tanish Sharma',      email: 'tanish.sharma@bosscoderacademy.com',      designation: 'Operations Associate',      department: 'Operations', managerRef: 'E584',  joiningDate: '2025-05-19', employmentType: 'full-time' },
  { ref: 'E9449', displayName: 'Jasleen Arora',      email: 'jasleen.arora@bosscoderacademy.com',      designation: 'Operations Associate',      department: 'Operations', managerRef: 'E584',  joiningDate: '2026-03-17', employmentType: 'full-time' },
  { ref: 'E9468', displayName: 'Bhupesh Madaan',     email: 'bhupesh.madaan@bosscoderacademy.com',     designation: 'Operations Associate',      department: 'Operations', managerRef: 'E584',  joiningDate: '2026-06-01', employmentType: 'full-time' },
  // Reports to E5591 (Nandani Mittal)
  { ref: 'E1011', displayName: 'Ritesh Bhati',       email: 'ritesh.bhati@bosscoderacademy.com',       designation: 'Operations Lead',           department: 'Operations', managerRef: 'E5591', joiningDate: '2024-01-15', employmentType: 'full-time' },
  { ref: 'E1156', displayName: 'Khushi Gupta',       email: 'khushi.gupta@bosscoderacademy.com',       designation: 'Operations Executive',      department: 'Operations', managerRef: 'E5591', joiningDate: '2024-06-03', employmentType: 'full-time' },
  { ref: 'E7954', displayName: 'Aryan Gupta',        email: 'aryan.gupta@bosscoderacademy.com',        designation: 'Operations Associate',      department: 'Operations', managerRef: 'E5591', joiningDate: '2025-05-19', employmentType: 'full-time' },
  { ref: 'E9406', displayName: 'Aashna Sharma',      email: 'aashna.sharma@bosscoderacademy.com',      designation: 'Operations Associate',      department: 'Operations', managerRef: 'E5591', joiningDate: '2026-01-14', employmentType: 'full-time' },
  { ref: 'E9425', displayName: 'Himansh Mahajan',    email: 'himansh.mahajan@bosscoderacademy.com',     designation: 'Operations Associate',      department: 'Operations', managerRef: 'E5591', joiningDate: '2026-02-02', employmentType: 'full-time' },
  { ref: 'E9448', displayName: 'Kuldeep Khaneja',    email: 'kuldeep.khaneja@bosscoderacademy.com',    designation: 'Operations Associate',      department: 'Operations', managerRef: 'E5591', joiningDate: '2026-03-17', employmentType: 'full-time' },
  { ref: 'C9559', displayName: 'Vansh Tiwari',       email: 'vansh.tiwari@bosscoderacademy.com',       designation: 'Operations Intern',         department: 'Operations', managerRef: 'E5591', joiningDate: '2026-03-09', employmentType: 'intern'    },
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

async function resolveByEmail(label, email) {
  const snap = await db.collection('hr_employees').where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  const id = snap.docs[0].data().employeeId;
  console.log(`  ✓ Resolved ${label} → employeeId: ${id}`);
  return id;
}

async function ensureFounder(displayName, email, designation) {
  const existing = await resolveByEmail(displayName, email);
  if (existing) return existing;

  console.log(`  ℹ  Not found — creating ${displayName} as ${designation}…`);
  const ref = db.collection('hr_employees').doc();
  const now = FieldValue.serverTimestamp();
  const doc = {
    employeeId: ref.id,
    userUid: null,
    displayName,
    email,
    personalEmail: null,
    phone: null,
    designation,
    department: 'Leadership',
    managedDepartments: [],
    teamId: null,
    managerId: null,
    joiningDate: Timestamp.fromDate(new Date('2020-01-01')),
    employmentType: 'full-time',
    status: 'active',
    exitDate: null,
    active: true,
    searchTokens: buildSearchTokens(displayName, email, designation, 'Leadership'),
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
  if (!DRY_RUN) await ref.set(doc);
  console.log(`  ✓ Created ${displayName} → employeeId: ${ref.id}`);
  return ref.id;
}

async function main() {
  console.log(`\nProject: ${serviceAccount.project_id}`);
  if (DRY_RUN) console.log('Mode: DRY RUN (no writes)');
  console.log('─'.repeat(60));

  // Step 1: resolve anchor records
  console.log('\nStep 1: resolving anchor employees…');
  const rajatId  = await ensureFounder('Rajat Garg',  'rajat.garg@bosscoderacademy.com',  'Founder');
  const manishId = await ensureFounder('Manish Garg', 'manish.garg@bosscoderacademy.com', 'Co-Founder');

  const idMap = { E1: rajatId, E2: manishId };

  // Step 2: check existing emails
  console.log('\nStep 2: checking for existing records…');
  const existingSnap = await db.collection('hr_employees').get();
  const existingEmails = new Set(existingSnap.docs.map((d) => d.data().email?.toLowerCase()));

  // Step 3: prepare records
  console.log('\nStep 3: preparing records…\n');

  const toCreate = [];
  const skipped  = [];

  for (const emp of EMPLOYEES) {
    const email = emp.email.toLowerCase();

    if (existingEmails.has(email)) {
      skipped.push(emp);
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
      joiningDate: Timestamp.fromDate(new Date(emp.joiningDate)),
      employmentType: emp.employmentType,
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

    const mgrName = EMPLOYEES.find(e => e.ref === emp.managerRef)?.displayName
      ?? { E1: 'Rajat Garg', E2: 'Manish Garg' }[emp.managerRef]
      ?? emp.managerRef;
    console.log(`  CREATE  ${emp.displayName} <${email}>`);
    console.log(`          ${emp.designation} · ${emp.department} · manager: ${mgrName}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`${toCreate.length} to create, ${skipped.length} skipped`);

  if (toCreate.length === 0 || DRY_RUN) {
    console.log(DRY_RUN ? '\nDry run complete — no writes made.\n' : '\nNothing to create.\n');
    process.exit(0);
  }

  // Step 4: write in batches
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

  console.log(`\n✓ Done. ${created} Operations employee(s) created.\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

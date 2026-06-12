/**
 * One-shot script: imports Sales department employees into hr_employees.
 * Skips any email that already exists. Resolves manager IDs from E-numbers
 * against Rajat Garg's live Firestore record.
 *
 * Run from project root:
 *   node --env-file=.env.local scripts/import-sales-employees.mjs
 *
 * Dry-run (preview only, no writes):
 *   node --env-file=.env.local scripts/import-sales-employees.mjs --dry-run
 *
 * NOTE: Two emails had typos in the source sheet — corrected below:
 *   upendra.sharma@bosscoderacademy     → upendra.sharma@bosscoderacademy.com
 *   nitn.upreti@bosscoderacademy,com    → nitin.upreti@bosscoderacademy.com  (also "nitn"→"nitin")
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

// ── employee data ─────────────────────────────────────────────────────────────
// Sorted: managers (E25, E537, E8863) first so idMap is populated before their reports.
// managerRef: 'E1' = Rajat Garg (resolved live from Firestore)
const EMPLOYEES = [
  // ── Tier 1: direct report to Rajat (E1) ──────────────────────────────────
  { ref: 'E25',   displayName: 'Kapil Patidar',          email: 'kapil@bosscoderacademy.com',                  designation: 'Growth Manager',                        department: 'Sales BST', managerRef: 'E1',    joiningDate: '2022-04-21' },

  // ── Tier 2: report to Kapil (E25) ────────────────────────────────────────
  { ref: 'E537',  displayName: 'Naman Shrivastav',        email: 'naman.shrivastav@bosscoderacademy.com',        designation: 'Business Development Manager',           department: 'Sales BST', managerRef: 'E25',   joiningDate: '2023-09-26' },
  { ref: 'E8863', displayName: 'Muskaan Mangla',          email: 'muskaan.mangla@bosscoderacademy.com',          designation: 'Business Development Manager',           department: 'Sales BST', managerRef: 'E25',   joiningDate: '2025-09-03' },
  { ref: 'E7063', displayName: 'Gaurang Yadav',           email: 'gaurang.yadav@bosscoderacademy.com',           designation: 'Business Development Executive',         department: 'Sales BST', managerRef: 'E25',   joiningDate: '2024-09-09' },
  { ref: 'E1153', displayName: 'Pankaj Kataria',          email: 'pankaj.kataria@bosscoderacademy.com',          designation: 'Business Development Executive',         department: 'Sales BST', managerRef: 'E25',   joiningDate: '2024-06-03' },
  { ref: 'E293',  displayName: 'Reetik Kumar',            email: 'reetik.kumar@bosscoderacademy.com',            designation: 'Senior Business Development Executive',  department: 'Sales BST', managerRef: 'E25',   joiningDate: '2023-08-23' },
  { ref: 'E8860', displayName: 'Nitin Upreti',            email: 'nitin.upreti@bosscoderacademy.com',            designation: 'Senior Business Development Executive',  department: 'Sales BST', managerRef: 'E25',   joiningDate: '2025-09-01' },
  { ref: 'E9439', displayName: 'Anshuta Singh',           email: 'anshuta.singh@bosscoderacademy.com',           designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E25',   joiningDate: '2026-03-05' },
  { ref: 'E9459', displayName: 'Khushi Sharma',           email: 'khushi.sharma@bosscoderacademy.com',           designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E25',   joiningDate: '2026-04-06' },
  { ref: 'E9548', displayName: 'Aman Singh',              email: 'aman@bosscoderacademy.com',                    designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E25',   joiningDate: '2026-04-06' },
  { ref: 'E9472', displayName: 'Aditya Sharma',           email: 'aditya.sharma@bosscoderacademy.com',           designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E25',   joiningDate: '2026-06-04' },

  // ── Tier 3: report to Naman (E537) ───────────────────────────────────────
  { ref: 'E7070', displayName: 'Upendra Kumar Sharma',    email: 'upendra.sharma@bosscoderacademy.com',          designation: 'Business Development Executive',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2024-11-11' },
  { ref: 'E582',  displayName: 'Jyoti Mishra',            email: 'jyoti.mishra@bosscoderacademy.com',            designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2023-12-04' },
  { ref: 'E7093', displayName: 'Shubham Tyagi',           email: 'shubham.tyagi@bosscoderacademy.com',           designation: 'Business Development Executive',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2024-11-26' },
  { ref: 'E8837', displayName: 'Iris Singh',              email: 'iris.singh@bosscoderacademy.com',              designation: 'Senior Business Development Executive',  department: 'Sales BST', managerRef: 'E537',  joiningDate: '2025-07-07' },
  { ref: 'E8851', displayName: 'Somnath Roy',             email: 'somnath.roy@bosscoderacademy.com',             designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2025-08-04' },
  { ref: 'E8894', displayName: 'Sonam Kharwar',           email: 'sonam.kharwar@bosscoderacademy.com',           designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2025-11-19' },
  { ref: 'E8897', displayName: 'Richa Singh',             email: 'richa.singh@bosscoderacademy.com',             designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2025-12-04' },
  { ref: 'E9321', displayName: 'Gauri Tripathi',          email: 'gauri.tripathi@bosscoderacademy.com',          designation: 'Senior Business Development Associate',  department: 'Sales BST', managerRef: 'E537',  joiningDate: '2026-01-08' },
  { ref: 'E9322', displayName: 'Aman Singh',              email: 'aman.singh@bosscoderacademy.com',              designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2026-01-08' },
  { ref: 'E9411', displayName: 'Prasanta Dasgupta',       email: 'prasanta.dasgupta@bosscoderacademy.com',       designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2026-01-22' },
  { ref: 'E9420', displayName: 'Aman Chauhan',            email: 'aman.chauhan@bosscoderacademy.com',            designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2026-02-05' },
  { ref: 'E9422', displayName: 'Anubhav Sharma',          email: 'anubhav.sharma@bosscoderacademy.com',          designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E537',  joiningDate: '2026-02-09' },
  { ref: 'E9436', displayName: 'Abbas Rizvi',             email: 'abbas.rizvi@bosscoderacademy.com',             designation: 'Sr. Business Development Associate',     department: 'Sales BST', managerRef: 'E537',  joiningDate: '2026-02-11' },
  { ref: 'E9433', displayName: 'Dhiraj Kumar',            email: 'dhiraj.kumar@bosscoderacademy.com',            designation: 'Sr. Business Development Associate',     department: 'Sales BST', managerRef: 'E537',  joiningDate: '2026-02-23' },

  // ── Tier 3: report to Muskaan (E8863) ────────────────────────────────────
  { ref: 'E5587', displayName: 'Sunil Gupta',             email: 'sunil.gupta@bosscoderacademy.com',             designation: 'Business Development Executive',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2024-07-15' },
  { ref: 'E8841', displayName: 'Pranay Srivastava',       email: 'pranay.srivastava@bosscoderacademy.com',       designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2025-07-23' },
  { ref: 'E8862', displayName: 'Soni Kumari',             email: 'soni.kumari@bosscoderacademy.com',             designation: 'Business Development Executive',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2025-09-01' },
  { ref: 'E580',  displayName: 'Nishant Raj',             email: 'nishant.raj@bosscoderacademy.com',             designation: 'Senior Business Development Executive',  department: 'Sales BST', managerRef: 'E8863', joiningDate: '2023-12-04' },
  { ref: 'E271',  displayName: 'Tanmay Debnath',          email: 'tanmay.debnath@bosscoderacademy.com',          designation: 'Business Development Executive',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2023-07-10' },
  { ref: 'E8898', displayName: 'Deepanshu Kumar',         email: 'deepanshu.kumar@bosscoderacademy.com',         designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2025-12-15' },
  { ref: 'E9403', displayName: 'Abhilasha Chaudhary',     email: 'abhilasha.chaudhary@bosscoderacademy.com',     designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2026-01-12' },
  { ref: 'E9402', displayName: 'Ritvik Bhandari',         email: 'ritvik.bhandari@bosscoderacademy.com',         designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2026-01-12' },
  { ref: 'E9474', displayName: 'Aditya Kumar',            email: 'aditya.kumar@bosscoderacademy.com',            designation: 'Business Development Associate',         department: 'Sales BST', managerRef: 'E8863', joiningDate: '2026-06-08' },
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

  // 1. Resolve Rajat Garg (E1) from Firestore
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
    if (!DRY_RUN) {
      await ref.set({
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
        dob: null, dateOfBirth: null,
        emergencyContact: { name: null, phone: null },
        createdAt: now, updatedAt: now,
        createdBy: 'import-script', updatedBy: 'import-script',
      });
    }
    console.log(`  ✓ Created Rajat Garg → employeeId: ${rajatFirestoreId}`);
  }

  // E-number → Firestore employeeId map; E1 = Rajat
  const idMap = { E1: rajatFirestoreId };

  // 2. Check which emails already exist
  console.log('\nStep 2: checking for existing records…');
  const existingSnap = await db.collection('hr_employees').get();
  const existingEmails = new Set(existingSnap.docs.map((d) => d.data().email?.toLowerCase()));

  // 3. Prepare records (EMPLOYEES already sorted: managers before reports)
  console.log('\nStep 3: preparing records…\n');
  const toCreate = [];
  const skipped = [];

  for (const emp of EMPLOYEES) {
    const email = emp.email.toLowerCase();
    if (existingEmails.has(email)) {
      skipped.push(emp);
      const existing = existingSnap.docs.find((d) => d.data().email?.toLowerCase() === email);
      if (existing) idMap[emp.ref] = existing.data().employeeId;
      console.log(`  SKIP    ${emp.displayName} <${email}>`);
      continue;
    }

    const managerId = emp.managerRef ? (idMap[emp.managerRef] ?? null) : null;
    if (emp.managerRef && !idMap[emp.managerRef]) {
      console.warn(`  WARN    ${emp.displayName}: managerRef ${emp.managerRef} not in idMap — managerId will be null`);
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
    const mgrLabel = emp.managerRef === 'E1'
      ? 'Rajat Garg'
      : EMPLOYEES.find((e) => e.ref === emp.managerRef)?.displayName ?? emp.managerRef;
    console.log(`  CREATE  ${emp.displayName} <${email}>`);
    console.log(`          ${emp.designation} · manager: ${mgrLabel}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`${toCreate.length} to create, ${skipped.length} skipped (already exist)`);

  if (toCreate.length === 0 || DRY_RUN) {
    console.log(DRY_RUN ? '\nDry run complete — no writes made.\n' : '\nNothing to create.\n');
    process.exit(0);
  }

  // 4. Write in batches of 450
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

  console.log(`\n✓ Done. ${created} Sales employee(s) created.\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

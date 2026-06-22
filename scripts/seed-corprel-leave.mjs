/**
 * One-off script: seeds Corporate Relations leave balances (FY2026) + backfills
 * their dated leave records from the HR sheet.
 *
 * Mapping (same as Tech): sheet "Total Leaves" → Casual pool; "WFH Taken" → wfh pool.
 * Privilege/Marriage/Medical/Unpaid untouched (merge write). Casual + half-day both
 * draw from the Casual pool.
 *
 * Idempotent: balances use merge; attendance + leave-request docs use deterministic
 * ids (<empId>_<date>), so re-running overwrites instead of duplicating.
 *
 * Dry-run:  node scripts/seed-corprel-leave.mjs --dry-run
 * Apply:    node scripts/seed-corprel-leave.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const FY = 2026; // financial-year start → docs keyed _FY2026

const __dir = dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n');
for (const line of envLines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({ ...sa, privateKey: sa.private_key.replace(/\\n/g, '\n') }),
});
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const KIND = {
  casual: { leaveType: 'casual',      status: 'leave',    label: 'Casual'   },
  half:   { leaveType: 'half-casual', status: 'half-day', label: 'Half Day' },
  wfh:    { leaveType: 'wfh',         status: 'wfh',       label: 'WFH'      },
};
const REASON = 'Backfilled from HR attendance sheet';

// casualTotal = "Total Leaves"; casualUsed = "Leaves taken"; wfhUsed = "WFH Taken"
const ROWS = [
  { name: 'Shadik Ahmad', casualTotal: 18, casualUsed: 2, wfhUsed: 0, entries: [
    { date: '2026-04-20', kind: 'casual' },
    { date: '2026-04-23', kind: 'casual' },
  ]},
  { name: 'Aman Srivastava', casualTotal: 18, casualUsed: 3, wfhUsed: 0, entries: [
    { date: '2026-04-09', kind: 'casual' },
    { date: '2026-04-17', kind: 'casual' },
    { date: '2026-06-12', kind: 'casual' },
  ]},
  { name: 'Mukund Sharma', casualTotal: 18, casualUsed: 6, wfhUsed: 0, entries: [
    { date: '2026-04-06', kind: 'casual' },
    { date: '2026-04-17', kind: 'casual' },
    { date: '2026-05-08', kind: 'casual' },
    { date: '2026-05-22', kind: 'casual' },
    { date: '2026-06-05', kind: 'casual' },
    { date: '2026-06-19', kind: 'casual' },
  ]},
  { name: 'Mehak Sachdeva', casualTotal: 18, casualUsed: 5, wfhUsed: 0, entries: [
    { date: '2026-05-06', kind: 'casual' },
    { date: '2026-05-07', kind: 'casual' },
    { date: '2026-05-08', kind: 'casual' },
    { date: '2026-05-29', kind: 'half'   },
    { date: '2026-06-10', kind: 'half'   },
    { date: '2026-06-17', kind: 'casual' },
  ]},
  { name: 'Utkarshini Mishra', casualTotal: 18, casualUsed: 8, wfhUsed: 0, entries: [
    { date: '2026-05-21', kind: 'casual' },
    { date: '2026-05-28', kind: 'casual' },
    { date: '2026-05-29', kind: 'casual' },
    { date: '2026-06-01', kind: 'casual' },
    { date: '2026-06-02', kind: 'casual' },
    { date: '2026-06-03', kind: 'casual' },
    { date: '2026-06-04', kind: 'casual' },
    { date: '2026-06-05', kind: 'casual' },
  ]},
];

const norm = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

async function main() {
  console.log(`\nProject: ${sa.project_id}`);
  console.log(`Balance FY: ${FY} (FY${FY}-${FY + 1})`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (no writes)' : 'Mode: APPLY (will write)');
  console.log('─'.repeat(74));

  const snap = await db.collection('hr_employees').get();
  const byName = new Map();
  for (const d of snap.docs) {
    const e = d.data();
    const k = norm(e.displayName);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push({ employeeId: e.employeeId, displayName: e.displayName, department: e.department });
  }

  const planned = [];
  const problems = [];
  for (const row of ROWS) {
    const matches = byName.get(norm(row.name)) ?? [];
    if (matches.length === 1) {
      planned.push({ row, emp: matches[0] });
    } else if (matches.length === 0) {
      problems.push(`NOT FOUND  "${row.name}" — skipped`);
    } else {
      problems.push(`AMBIGUOUS  "${row.name}" → ${matches.length} matches (${matches.map((m) => `${m.employeeId}:${m.department}`).join(', ')}) — skipped`);
    }
  }

  console.log('\nPlanned writes:\n');
  console.log('  ' + 'Employee'.padEnd(20) + 'Dept'.padEnd(22) + 'Casual'.padEnd(9) + 'WFH'.padEnd(6) + 'Rem'.padEnd(6) + '#dates');
  for (const p of planned) {
    console.log(
      '  ' + p.emp.displayName.padEnd(20) + (p.emp.department ?? '—').padEnd(22) +
      `${p.row.casualUsed}/${p.row.casualTotal}`.padEnd(9) + `${p.row.wfhUsed}`.padEnd(6) +
      `${p.row.casualTotal - p.row.casualUsed}`.padEnd(6) + `${p.row.entries.length}`,
    );
  }
  if (problems.length) {
    console.log('\nIssues:\n');
    for (const pr of problems) console.log('  ⚠  ' + pr);
  }
  console.log('\n' + '─'.repeat(74));
  const totalRecords = planned.reduce((s, p) => s + p.row.entries.length, 0);
  console.log(`${planned.length}/${ROWS.length} employees → ${planned.length} balances + ${totalRecords} attendance records + ${totalRecords} leave requests.`);

  if (DRY_RUN) { console.log('\nDry run complete — no writes made.\n'); process.exit(0); }
  if (planned.length === 0) { console.log('\nNothing to write.\n'); process.exit(0); }

  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const add = (ref, doc, merge = false) => { batch.set(ref, doc, merge ? { merge: true } : {}); if (++ops >= 400) return flush(); };

  for (const { row, emp } of planned) {
    // 1) balance (merge — preserves other pools)
    await add(
      db.collection('hr_leave_balances').doc(`${emp.employeeId}_FY${FY}`),
      { employeeId: emp.employeeId, year: FY, casual: { total: row.casualTotal, used: row.casualUsed }, wfh: { total: 0, used: row.wfhUsed } },
      true,
    );
    // 2) dated records + approved leave requests (deterministic ids → idempotent)
    for (const e of row.entries) {
      const k = KIND[e.kind];
      await add(db.collection('hr_attendance_records').doc(`${emp.employeeId}_${e.date}`), {
        employeeId: emp.employeeId, date: e.date, checkIn: null, checkOut: null,
        status: k.status, duration: 0,
        remarks: `${e.kind === 'wfh' ? 'WFH' : 'Leave'}: ${REASON}`,
        editedBy: 'seed-script', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      }, true);
      await add(db.collection('hr_leave_requests').doc(`${emp.employeeId}_${e.date}`), {
        employeeId: emp.employeeId, employeeName: emp.displayName,
        fromDate: e.date, toDate: e.date, leaveType: k.leaveType, reason: REASON,
        status: 'approved', approvedBy: 'seed-script', approvedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }, true);
    }
  }
  await flush();
  console.log(`\n✓ Done. ${planned.length} balances + ${totalRecords} records + ${totalRecords} leave requests written.\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

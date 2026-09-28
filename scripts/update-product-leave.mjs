/**
 * One-off follow-up to seed-product-leave.mjs: adds the Product leave taken
 * since that seed (late June → September) from the updated HR sheet, and sets
 * each FY2026 balance to the sheet's cumulative "used" figure.
 *
 * Same mapping/idempotency as the seed (deterministic `${employeeId}_${date}` ids).
 * Before writing, each balance is checked: current `used` + new entries must equal
 * the sheet's total, otherwise that employee is skipped.
 *
 * Sheet notes:
 *   - Gaurav Singh's sheet now also lists 15/21/24 April and 4 May, which were
 *     missing at seed time; they're included here.
 *   - Side-column notes (Gaurav "24 sep full", Ayush "Oct ltm wfh") aren't counted
 *     in the sheet's remaining figures, so they're ignored.
 *
 * Unchanged since the seed, so not listed: Ayush Prashar, Mallika Arora,
 * Pranjal Yadav, Chakshu Menon, Vansh Sudan. Raman Salar has no portal record.
 *
 * Dry-run:  node scripts/update-product-leave.mjs --dry-run
 * Apply:    node scripts/update-product-leave.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const FY = 2026;

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
  casual: { leaveType: 'casual',      status: 'leave',    days: 1   },
  half:   { leaveType: 'half-casual', status: 'half-day', days: 0.5 },
  wfh:    { leaveType: 'wfh',         status: 'wfh',      days: 1   },
};
const REASON = 'Backfilled from HR attendance sheet';

// usedTotal = cumulative leave used for FY2026 per the sheet (Total − Remaining).
// unpaid = portion of usedTotal beyond casualTotal, recorded as LOP.
const ROWS = [
  { name: 'Gaurav Singh', casualTotal: 18, usedTotal: 7, entries: [
    { date: '2026-04-15', kind: 'casual' }, { date: '2026-04-21', kind: 'casual' },
    { date: '2026-04-24', kind: 'casual' }, { date: '2026-05-04', kind: 'casual' },
    { date: '2026-07-06', kind: 'casual' },
  ]},
  { name: 'Ankit Singh', casualTotal: 18, usedTotal: 6.5, entries: [
    { date: '2026-06-26', kind: 'casual' }, { date: '2026-07-10', kind: 'casual' },
    { date: '2026-08-25', kind: 'half' },   { date: '2026-08-28', kind: 'casual' },
    { date: '2026-08-31', kind: 'half' },   { date: '2026-09-15', kind: 'half' },
  ]},
  { name: 'Harshit Srivastava', casualTotal: 18, usedTotal: 8.5, entries: [
    { date: '2026-07-02', kind: 'casual' }, { date: '2026-07-24', kind: 'half' },
    { date: '2026-08-21', kind: 'casual' }, { date: '2026-09-11', kind: 'casual' },
    { date: '2026-09-22', kind: 'casual' },
  ]},
  { name: 'Pradyuman Rana', casualTotal: 18, usedTotal: 11.5, entries: [
    { date: '2026-06-24', kind: 'half' },   { date: '2026-07-24', kind: 'casual' },
    { date: '2026-08-18', kind: 'half' },   { date: '2026-08-25', kind: 'casual' },
    { date: '2026-08-27', kind: 'casual' }, { date: '2026-09-11', kind: 'casual' },
    { date: '2026-09-23', kind: 'half' },   { date: '2026-09-24', kind: 'casual' },
  ]},
  { name: 'Anvay Dubey', casualTotal: 18, usedTotal: 5.5, entries: [
    { date: '2026-06-30', kind: 'casual' },
  ]},
];

const norm = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const leaveDays = (entries) => entries.filter((e) => e.kind !== 'wfh').reduce((s, e) => s + KIND[e.kind].days, 0);

async function main() {
  console.log(`\nProject: ${sa.project_id}`);
  console.log(`Balance FY: ${FY} (FY${FY}-${FY + 1})`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (no writes)' : 'Mode: APPLY (will write)');
  console.log('─'.repeat(78));

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
    if (matches.length !== 1) {
      problems.push(matches.length === 0
        ? `NOT FOUND  "${row.name}" — skipped`
        : `AMBIGUOUS  "${row.name}" → ${matches.map((m) => `${m.employeeId}:${m.department}`).join(', ')} — skipped`);
      continue;
    }
    const emp = matches[0];

    const bal = (await db.collection('hr_leave_balances').doc(`${emp.employeeId}_FY${FY}`).get()).data() ?? {};
    const currentUsed = (bal.casual?.used ?? 0) + (bal.unpaid?.used ?? 0);

    const existing = await db.getAll(
      ...row.entries.map((e) => db.collection('hr_leave_requests').doc(`${emp.employeeId}_${e.date}`)),
    );
    const clashes = existing.filter((d) => d.exists).map((d) => d.id.split('_')[1]);
    if (clashes.length) {
      problems.push(`CLASH      "${row.name}" already has leave on ${clashes.join(', ')} — skipped`);
      continue;
    }

    const expected = currentUsed + leaveDays(row.entries);
    if (expected !== row.usedTotal) {
      problems.push(`MISMATCH   "${row.name}" current ${currentUsed} + new ${leaveDays(row.entries)} = ${expected}, sheet says ${row.usedTotal} — skipped`);
      continue;
    }

    const casualUsed = Math.min(row.usedTotal, row.casualTotal);
    const unpaidUsed = row.usedTotal - casualUsed;
    planned.push({ row, emp, currentUsed, casualUsed, unpaidUsed });
  }

  console.log('\nPlanned writes:\n');
  console.log('  ' + 'Employee'.padEnd(22) + 'Dept'.padEnd(12) + 'Used before→after'.padEnd(20) + 'Casual'.padEnd(10) + 'Unpaid'.padEnd(8) + 'Rem'.padEnd(6) + '+dates');
  for (const p of planned) {
    console.log(
      '  ' + p.emp.displayName.padEnd(22) + (p.emp.department ?? '—').padEnd(12) +
      `${p.currentUsed} → ${p.row.usedTotal}`.padEnd(20) + `${p.casualUsed}/${p.row.casualTotal}`.padEnd(10) +
      `${p.unpaidUsed}`.padEnd(8) + `${p.row.casualTotal - p.row.usedTotal}`.padEnd(6) + `${p.row.entries.length}`,
    );
  }
  if (problems.length) { console.log('\nIssues:\n'); for (const pr of problems) console.log('  ⚠  ' + pr); }

  console.log('\n' + '─'.repeat(78));
  const totalRecords = planned.reduce((s, p) => s + p.row.entries.length, 0);
  console.log(`${planned.length}/${ROWS.length} employees → ${planned.length} balances + ${totalRecords} attendance records + ${totalRecords} leave requests.`);

  if (DRY_RUN) { console.log('\nDry run complete — no writes made.\n'); process.exit(0); }
  if (planned.length === 0) { console.log('\nNothing to write.\n'); process.exit(0); }

  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const add = (ref, doc, merge = false) => { batch.set(ref, doc, merge ? { merge: true } : {}); if (++ops >= 400) return flush(); };

  for (const { row, emp, casualUsed, unpaidUsed } of planned) {
    const balance = { employeeId: emp.employeeId, year: FY, casual: { total: row.casualTotal, used: casualUsed } };
    if (unpaidUsed > 0) balance.unpaid = { total: 0, used: unpaidUsed };
    await add(db.collection('hr_leave_balances').doc(`${emp.employeeId}_FY${FY}`), balance, true);

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

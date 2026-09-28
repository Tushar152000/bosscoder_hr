/**
 * One-off follow-up to update-tech-leave-balances.mjs + backfill-tech-leave-records.mjs:
 * adds the Technology leave taken since then (July → October) from the updated HR
 * sheet, and brings each FY2026 balance's `used` up to the sheet's cumulative figure.
 *
 * Differs from the other update-<dept>-leave scripts because Technology is live on
 * attendance and HR has edited some balances in the app:
 *   - Only `casual.used` is written; pool totals are preserved (e.g. Divyam Dubey
 *     was split to casual 9 + privilege 9 in the app).
 *   - Clash detection is by date range against ALL leave requests (the original
 *     backfill used random doc ids), plus any attendance doc that has a check-in.
 * Before writing, each balance is checked: current used (casual + privilege + unpaid)
 * + new entries must equal the sheet's total, otherwise that employee is skipped.
 *
 * Sheet interpretations (confirmed with HR owner):
 *   - Divyam Dubey's 31 July is labelled "Half Day" but counted as 1 → full day.
 *   - Yashswi Singh's approved 29 Sep – 1 Oct are recorded ahead of time.
 *
 * Unchanged, so not listed: Ibrar Ali. No leave + no unique portal match: Harsh,
 * Durgesh Paliwal.
 *
 * Dry-run:  node scripts/update-tech-leave.mjs --dry-run
 * Apply:    node scripts/update-tech-leave.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const FY = 2026;
const DEPARTMENT = 'Technology';

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
};
const REASON = 'Backfilled from HR attendance sheet';

// usedTotal = cumulative leave used for FY2026 per the sheet (Total − Remaining).
const ROWS = [
  { name: 'Mohit Srivastava', usedTotal: 6, entries: [
    { date: '2026-09-03', kind: 'casual' }, { date: '2026-09-16', kind: 'casual' },
    { date: '2026-09-18', kind: 'casual' },
  ]},
  { name: 'Pavitra Lalwani', usedTotal: 4, entries: [
    { date: '2026-07-01', kind: 'casual' }, { date: '2026-07-28', kind: 'half' },
    { date: '2026-08-19', kind: 'half' },   { date: '2026-09-18', kind: 'casual' },
  ]},
  { name: 'Tushar Chauhan', usedTotal: 3, entries: [
    { date: '2026-07-15', kind: 'casual' }, { date: '2026-08-14', kind: 'half' },
    { date: '2026-09-01', kind: 'half' },   { date: '2026-09-07', kind: 'casual' },
  ]},
  { name: 'Divyam Dubey', usedTotal: 5, entries: [
    { date: '2026-07-31', kind: 'casual' },
  ]},
  { name: 'Yashswi Singh', usedTotal: 8.5, entries: [
    { date: '2026-07-27', kind: 'half' },   { date: '2026-09-28', kind: 'casual' },
    { date: '2026-09-29', kind: 'casual' }, { date: '2026-09-30', kind: 'casual' },
    { date: '2026-10-01', kind: 'casual' },
  ]},
];

const norm = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const leaveDays = (entries) => entries.reduce((s, e) => s + KIND[e.kind].days, 0);
const isWeekend = (date) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());

async function main() {
  console.log(`\nProject: ${sa.project_id}`);
  console.log(`Balance FY: ${FY} (FY${FY}-${FY + 1})`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (no writes)' : 'Mode: APPLY (will write)');
  console.log('─'.repeat(78));

  const snap = await db.collection('hr_employees').where('department', '==', DEPARTMENT).get();
  const byName = new Map();
  for (const d of snap.docs) {
    const e = d.data();
    const k = norm(e.displayName);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push({ employeeId: e.employeeId, displayName: e.displayName });
  }

  const planned = [];
  const problems = [];
  for (const row of ROWS) {
    const matches = byName.get(norm(row.name)) ?? [];
    if (matches.length !== 1) {
      problems.push(`${matches.length ? 'AMBIGUOUS' : 'NOT FOUND'}  "${row.name}" in ${DEPARTMENT} — skipped`);
      continue;
    }
    const emp = matches[0];

    const reqs = (await db.collection('hr_leave_requests').where('employeeId', '==', emp.employeeId).get())
      .docs.map((d) => d.data()).filter((r) => r.status !== 'rejected');
    const reqClashes = row.entries.filter((e) => reqs.some((r) => r.fromDate <= e.date && e.date <= r.toDate));
    const att = await db.getAll(
      ...row.entries.map((e) => db.collection('hr_attendance_records').doc(`${emp.employeeId}_${e.date}`)),
    );
    const attClashes = att.filter((d) => d.exists && (d.data().checkIn || d.data().status !== 'present'));
    if (reqClashes.length || attClashes.length) {
      const dates = [...new Set([...reqClashes.map((e) => e.date), ...attClashes.map((d) => d.id.split('_')[1])])];
      problems.push(`CLASH      "${row.name}" already has leave/attendance on ${dates.sort().join(', ')} — skipped`);
      continue;
    }

    const bal = (await db.collection('hr_leave_balances').doc(`${emp.employeeId}_FY${FY}`).get()).data() ?? {};
    const casual = bal.casual ?? { total: 18, used: 0 };
    const otherUsed = (bal.privilege?.used ?? 0) + (bal.unpaid?.used ?? 0);
    const currentUsed = casual.used + otherUsed;
    const expected = currentUsed + leaveDays(row.entries);
    if (expected !== row.usedTotal) {
      problems.push(`MISMATCH   "${row.name}" current ${currentUsed} + new ${leaveDays(row.entries)} = ${expected}, sheet says ${row.usedTotal} — skipped`);
      continue;
    }
    const casualUsed = row.usedTotal - otherUsed;
    if (casualUsed > casual.total) {
      problems.push(`OVER       "${row.name}" casual would be ${casualUsed}/${casual.total} — skipped (decide how to cascade)`);
      continue;
    }
    planned.push({ row, emp, casual, currentUsed, casualUsed });
  }

  console.log('\nPlanned writes:\n');
  console.log('  ' + 'Employee'.padEnd(22) + 'Used before→after'.padEnd(20) + 'Casual'.padEnd(12) + '+dates');
  for (const p of planned) {
    console.log(
      '  ' + p.emp.displayName.padEnd(22) + `${p.currentUsed} → ${p.row.usedTotal}`.padEnd(20) +
      `${p.casualUsed}/${p.casual.total}`.padEnd(12) + `${p.row.entries.length}`,
    );
    const weekends = p.row.entries.filter((e) => isWeekend(e.date)).map((e) => e.date);
    if (weekends.length) console.log(`      (weekend dates recorded as written: ${weekends.join(', ')})`);
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
  const add = (ref, doc) => { batch.set(ref, doc, { merge: true }); if (++ops >= 400) return flush(); };

  for (const { row, emp, casualUsed } of planned) {
    // Deep-merge: only casual.used changes; totals and other pools are preserved.
    await add(db.collection('hr_leave_balances').doc(`${emp.employeeId}_FY${FY}`), {
      employeeId: emp.employeeId, year: FY, casual: { used: casualUsed },
    });
    for (const e of row.entries) {
      const k = KIND[e.kind];
      await add(db.collection('hr_attendance_records').doc(`${emp.employeeId}_${e.date}`), {
        employeeId: emp.employeeId, date: e.date, checkIn: null, checkOut: null,
        status: k.status, duration: 0, remarks: `Leave: ${REASON}`,
        editedBy: 'seed-script', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      await add(db.collection('hr_leave_requests').doc(`${emp.employeeId}_${e.date}`), {
        employeeId: emp.employeeId, employeeName: emp.displayName,
        fromDate: e.date, toDate: e.date, leaveType: k.leaveType, reason: REASON,
        status: 'approved', approvedBy: 'seed-script', approvedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }
  await flush();
  console.log(`\n✓ Done. ${planned.length} balances + ${totalRecords} records + ${totalRecords} leave requests written.\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

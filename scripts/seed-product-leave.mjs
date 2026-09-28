/**
 * One-off: seeds Product leave balances (FY2026) + backfills dated records.
 * Same mapping/idempotency as the other seed-*-leave scripts.
 *   Dry-run: node scripts/seed-product-leave.mjs --dry-run
 *   Apply:   node scripts/seed-product-leave.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const FY = 2026;
const __dir = dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n');
for (const line of envLines) { const m = line.match(/^([^#=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, ''); }
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert({ ...sa, privateKey: sa.private_key.replace(/\\n/g, '\n') }) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const KIND = {
  casual: { leaveType: 'casual', status: 'leave', label: 'Casual' },
  half:   { leaveType: 'half-casual', status: 'half-day', label: 'Half Day' },
  wfh:    { leaveType: 'wfh', status: 'wfh', label: 'WFH' },
};
const REASON = 'Backfilled from HR attendance sheet';

const ROWS = [
  { name: 'Gaurav Singh', casualTotal: 18, casualUsed: 2, wfhUsed: 0, entries: [
    { date: '2026-05-15', kind: 'casual' }, { date: '2026-06-02', kind: 'casual' } ]},
  { name: 'Raman Salar', casualTotal: 18, casualUsed: 2, wfhUsed: 0, entries: [
    { date: '2026-04-01', kind: 'casual' }, { date: '2026-04-02', kind: 'casual' } ]},
  { name: 'Ankit Singh', casualTotal: 18, casualUsed: 2, wfhUsed: 0, entries: [
    { date: '2026-05-14', kind: 'half' }, { date: '2026-05-06', kind: 'casual' }, { date: '2026-06-05', kind: 'half' } ]},
  { name: 'Ayush Prashar', casualTotal: 18, casualUsed: 5.5, wfhUsed: 0, entries: [
    { date: '2026-04-06', kind: 'half' }, { date: '2026-04-13', kind: 'half' }, { date: '2026-04-15', kind: 'casual' },
    { date: '2026-04-28', kind: 'half' }, { date: '2026-05-08', kind: 'casual' }, { date: '2026-06-01', kind: 'casual' },
    { date: '2026-06-05', kind: 'half' }, { date: '2026-06-17', kind: 'half' } ]},
  { name: 'Harshit Srivastava', casualTotal: 18, casualUsed: 4, wfhUsed: 0, entries: [
    { date: '2026-04-23', kind: 'casual' }, { date: '2026-05-08', kind: 'casual' }, { date: '2026-05-11', kind: 'half' },
    { date: '2026-05-29', kind: 'half' }, { date: '2026-06-10', kind: 'casual' } ]},
  { name: 'Pradyuman Rana', casualTotal: 18, casualUsed: 5, wfhUsed: 0, entries: [
    { date: '2026-04-09', kind: 'half' }, { date: '2026-05-08', kind: 'casual' }, { date: '2026-05-19', kind: 'half' },
    { date: '2026-05-28', kind: 'half' }, { date: '2026-06-01', kind: 'casual' }, { date: '2026-06-03', kind: 'casual' },
    { date: '2026-06-11', kind: 'half' } ]},
  { name: 'Mallika Arora', casualTotal: 24, casualUsed: 0, wfhUsed: 0, entries: [] },
  { name: 'Pranjal Yadav', casualTotal: 15, casualUsed: 0, wfhUsed: 0, entries: [] },
  { name: 'Anvay Dubey', casualTotal: 18, casualUsed: 4.5, wfhUsed: 0, entries: [
    { date: '2026-04-07', kind: 'half' }, { date: '2026-04-16', kind: 'casual' }, { date: '2026-04-20', kind: 'half' },
    { date: '2026-05-28', kind: 'half' }, { date: '2026-06-01', kind: 'half' }, { date: '2026-06-11', kind: 'half' },
    { date: '2026-06-15', kind: 'casual' } ]},
  { name: 'Chakshu Menon', casualTotal: 18, casualUsed: 1, wfhUsed: 0, entries: [
    { date: '2026-06-17', kind: 'casual' } ]},
  { name: 'Vansh Sudan', casualTotal: 18, casualUsed: 2.5, wfhUsed: 0, entries: [
    { date: '2026-05-18', kind: 'casual' }, { date: '2026-05-19', kind: 'casual' }, { date: '2026-06-11', kind: 'half' } ]},
];

const norm = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
async function main() {
  console.log(`\nProject: ${sa.project_id}\nBalance FY: ${FY}\nMode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log('─'.repeat(74));
  const snap = await db.collection('hr_employees').get();
  const byName = new Map();
  for (const d of snap.docs) { const e = d.data(); const k = norm(e.displayName); if (!byName.has(k)) byName.set(k, []); byName.get(k).push({ employeeId: e.employeeId, displayName: e.displayName, department: e.department }); }
  const planned = [], problems = [];
  for (const row of ROWS) {
    const m = byName.get(norm(row.name)) ?? [];
    if (m.length === 1) planned.push({ row, emp: m[0] });
    else if (!m.length) problems.push(`NOT FOUND  "${row.name}"`);
    else problems.push(`AMBIGUOUS  "${row.name}" → ${m.map((x) => `${x.employeeId}:${x.department}`).join(', ')}`);
  }
  console.log('\n  ' + 'Employee'.padEnd(20) + 'Dept'.padEnd(14) + 'Casual'.padEnd(10) + 'WFH'.padEnd(5) + 'Rem'.padEnd(6) + '#dates');
  for (const p of planned) console.log('  ' + p.emp.displayName.padEnd(20) + (p.emp.department ?? '—').padEnd(14) + `${p.row.casualUsed}/${p.row.casualTotal}`.padEnd(10) + `${p.row.wfhUsed}`.padEnd(5) + `${p.row.casualTotal - p.row.casualUsed}`.padEnd(6) + `${p.row.entries.length}`);
  if (problems.length) { console.log('\nIssues:'); for (const pr of problems) console.log('  ⚠  ' + pr + ' — skipped'); }
  const recs = planned.reduce((s, p) => s + p.row.entries.length, 0);
  console.log('\n' + '─'.repeat(74) + `\n${planned.length}/${ROWS.length} employees → ${planned.length} balances + ${recs} records + ${recs} leave requests.`);
  if (DRY_RUN) { console.log('\nDry run complete — no writes.\n'); process.exit(0); }
  if (!planned.length) { console.log('\nNothing to write.\n'); process.exit(0); }
  let batch = db.batch(), ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const add = (ref, doc) => { batch.set(ref, doc, { merge: true }); if (++ops >= 400) return flush(); };
  for (const { row, emp } of planned) {
    await add(db.collection('hr_leave_balances').doc(`${emp.employeeId}_FY${FY}`), { employeeId: emp.employeeId, year: FY, casual: { total: row.casualTotal, used: row.casualUsed }, wfh: { total: 0, used: row.wfhUsed } });
    for (const e of row.entries) {
      const k = KIND[e.kind];
      await add(db.collection('hr_attendance_records').doc(`${emp.employeeId}_${e.date}`), { employeeId: emp.employeeId, date: e.date, checkIn: null, checkOut: null, status: k.status, duration: 0, remarks: `${e.kind === 'wfh' ? 'WFH' : 'Leave'}: ${REASON}`, editedBy: 'seed-script', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      await add(db.collection('hr_leave_requests').doc(`${emp.employeeId}_${e.date}`), { employeeId: emp.employeeId, employeeName: emp.displayName, fromDate: e.date, toDate: e.date, leaveType: k.leaveType, reason: REASON, status: 'approved', approvedBy: 'seed-script', approvedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() });
    }
  }
  await flush();
  console.log(`\n✓ Done. ${planned.length} balances + ${recs} records + ${recs} leave requests.\n`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

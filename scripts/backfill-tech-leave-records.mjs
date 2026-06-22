/**
 * One-off script: backfills the dated leave entries for the Technology dept
 * (2026) from the HR sheet, so they appear on calendars + leave history.
 *
 * For each dated leave it writes:
 *   1. an attendance record (hr_attendance_records/<empId>_<date>) with the
 *      matching status (leave / half-day / wfh) — drives the calendar colour.
 *   2. an APPROVED leave request (hr_leave_requests) — drives the history.
 *
 * Balances are NOT touched here (already seeded by update-tech-leave-balances.mjs),
 * and we write approved docs directly — so there is no double-deduction.
 *
 * Dry-run:  node scripts/backfill-tech-leave-records.mjs --dry-run
 * Apply:    node scripts/backfill-tech-leave-records.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

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

// kind → leaveType / attendance status / display label
const KIND = {
  casual: { leaveType: 'casual',      status: 'leave',    label: 'Casual'   },
  half:   { leaveType: 'half-casual', status: 'half-day', label: 'Half Day' },
  wfh:    { leaveType: 'wfh',         status: 'wfh',       label: 'WFH'      },
};

// Verified employeeIds (from update-tech-leave-balances dry-run).
const EMP = [
  { name: 'Ibrar Ali',        id: 'jZclXz5v6mCx2op4kbYr', entries: [
    { date: '2026-06-03', kind: 'casual' },
    { date: '2026-06-04', kind: 'casual' },
    { date: '2026-06-05', kind: 'casual' },
    { date: '2026-06-09', kind: 'casual' },
  ]},
  { name: 'Mohit Srivastava', id: 'eKDggLfQ4w84IvKd2fFB', entries: [
    { date: '2026-04-20', kind: 'casual' },
    { date: '2026-06-18', kind: 'casual' },
    { date: '2026-06-19', kind: 'casual' },
  ]},
  { name: 'Pavitra Lalwani',  id: 'E4oaPIyee7DI3ITJ9ktf', entries: [
    { date: '2026-06-19', kind: 'casual' },
  ]},
  { name: 'Divyam Dubey',     id: 'WOopzo5kBLpla6WdhHbV', entries: [
    { date: '2026-04-27', kind: 'wfh'    },
    { date: '2026-04-28', kind: 'wfh'    },
    { date: '2026-04-29', kind: 'casual' },
    { date: '2026-04-30', kind: 'casual' },
    { date: '2026-05-01', kind: 'casual' },
    { date: '2026-05-21', kind: 'half'   },
    { date: '2026-06-12', kind: 'half'   },
  ]},
  { name: 'Yashswi Singh',    id: 'iKWjOVSm8xNn7qwPhwtG', entries: [
    { date: '2026-05-25', kind: 'casual' },
    { date: '2026-05-26', kind: 'casual' },
    { date: '2026-05-27', kind: 'casual' },
    { date: '2026-06-02', kind: 'casual' },
  ]},
];

const REASON = 'Backfilled from HR attendance sheet';

async function main() {
  console.log(`\nProject: ${sa.project_id}`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (no writes)' : 'Mode: APPLY (will write)');
  console.log('─'.repeat(70));

  const attRecords = []; // { id, doc }
  const leaveReqs  = []; // { doc }

  for (const emp of EMP) {
    console.log(`\n  ${emp.name} [${emp.id}] — ${emp.entries.length} entr${emp.entries.length === 1 ? 'y' : 'ies'}`);
    for (const e of emp.entries) {
      const k = KIND[e.kind];
      console.log(`     ${e.date}  ${k.label.padEnd(9)} → status '${k.status}', leaveType '${k.leaveType}'`);

      attRecords.push({
        id: `${emp.id}_${e.date}`,
        doc: {
          employeeId: emp.id,
          date: e.date,
          checkIn: null,
          checkOut: null,
          status: k.status,
          duration: 0,
          remarks: `${e.kind === 'wfh' ? 'WFH' : 'Leave'}: ${REASON}`,
          editedBy: 'backfill-script',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      });

      leaveReqs.push({
        doc: {
          employeeId: emp.id,
          employeeName: emp.name,
          fromDate: e.date,
          toDate: e.date,
          leaveType: k.leaveType,
          reason: REASON,
          status: 'approved',
          approvedBy: 'backfill-script',
          approvedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
      });
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`${attRecords.length} attendance records + ${leaveReqs.length} approved leave requests to write.`);

  if (DRY_RUN) {
    console.log('\nDry run complete — no writes made.\n');
    process.exit(0);
  }

  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };

  for (const r of attRecords) {
    batch.set(db.collection('hr_attendance_records').doc(r.id), r.doc, { merge: true });
    if (++ops >= 400) await flush();
  }
  for (const r of leaveReqs) {
    batch.set(db.collection('hr_leave_requests').doc(), r.doc);
    if (++ops >= 400) await flush();
  }
  await flush();

  console.log(`\n✓ Done. Backfilled ${attRecords.length} attendance records and ${leaveReqs.length} leave requests.\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

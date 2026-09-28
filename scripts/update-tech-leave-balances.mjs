/**
 * One-off script: seeds the Technology department's leave balances for 2026
 * from the HR-provided sheet.
 *
 * Mapping decision (confirmed): the sheet's single "Total Leaves" maps onto the
 * Casual pool; WFH taken maps onto the (uncapped) WFH pool. Privilege / Marriage
 * / Medical / Unpaid are left untouched (defaults preserved via merge write).
 *
 * Employees are resolved by displayName within department === 'Technology'.
 *
 * Dry-run (no writes — resolves names + prints planned writes):
 *   node scripts/update-tech-leave-balances.mjs --dry-run
 *
 * Apply:
 *   node scripts/update-tech-leave-balances.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
// Financial-year start (Indian FY Apr–Mar). FY2026 = Apr 2026 → Mar 2027.
const YEAR = 2026;
const DOC_SUFFIX = `_FY${YEAR}`;
const STALE_SUFFIX = `_${YEAR}`; // plain calendar-year docs written before the FY migration

// ── Load .env.local manually (no dotenv dep needed) ───────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
const sa = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({
    ...sa,
    privateKey: sa.private_key.replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// ── Sheet data (Technology department) ────────────────────────────────────────
// casualTotal = "Total Leaves"; casualUsed = "Leaves taken"; wfhUsed = "WFH Taken"
const ROWS = [
  // Full-time staff — exact figures from the sheet.
  { name: 'Ibrar Ali',        casualTotal: 18, casualUsed: 4, wfhUsed: 0 },
  { name: 'Mohit Srivastava', casualTotal: 18, casualUsed: 3, wfhUsed: 0 },
  { name: 'Pavitra Lalwani',  casualTotal: 18, casualUsed: 1, wfhUsed: 0 },
  { name: 'Tushar Chauhan',   casualTotal: 18, casualUsed: 0, wfhUsed: 0 },
  { name: 'Divyam Dubey',     casualTotal: 18, casualUsed: 4, wfhUsed: 2 },
  { name: 'Yashswi Singh',    casualTotal: 18, casualUsed: 4, wfhUsed: 0 },
  // Interns — flat 15 total leaves, none taken yet.
  { name: 'Suniti Paliwal',   casualTotal: 15, casualUsed: 0, wfhUsed: 0 },
  { name: 'Mausumi Ghadei',   casualTotal: 15, casualUsed: 0, wfhUsed: 0 },
  // Skipped intentionally: Durgesh Paliwal (left the company), Harsh (no Technology record).
];

const norm = (s) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

async function main() {
  console.log(`\nProject: ${sa.project_id}`);
  console.log(`Balance year: ${YEAR}`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (no writes)' : 'Mode: APPLY (will write)');
  console.log('─'.repeat(70));

  // Load all employees once.
  const snap = await db.collection('hr_employees').get();
  const byName = new Map();   // normalized displayName -> [emp]
  for (const d of snap.docs) {
    const data = d.data();
    const key = norm(data.displayName);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push({ employeeId: data.employeeId, displayName: data.displayName, department: data.department });
  }

  const planned = [];
  const problems = [];

  for (const row of ROWS) {
    const matches = byName.get(norm(row.name)) ?? [];
    const tech = matches.filter((m) => norm(m.department) === 'technology');

    let chosen = null;
    if (tech.length === 1) chosen = tech[0];
    else if (tech.length > 1) {
      problems.push(`AMBIGUOUS  "${row.name}" → ${tech.length} Technology matches (${tech.map((t) => t.employeeId).join(', ')}) — skipped`);
    } else if (matches.length === 1) {
      chosen = matches[0];
      problems.push(`OTHER DEPT "${row.name}" found in "${chosen.department}" (not Technology) — will use it`);
    } else if (matches.length > 1) {
      problems.push(`AMBIGUOUS  "${row.name}" → ${matches.length} matches across depts — skipped`);
    } else {
      // fuzzy suggestion
      const sugg = [...byName.keys()].filter((k) => k.includes(norm(row.name)) || norm(row.name).split(' ').some((p) => p.length > 2 && k.includes(p))).slice(0, 4);
      problems.push(`NOT FOUND  "${row.name}"${sugg.length ? ` — did you mean: ${sugg.join(' | ')}` : ''} — skipped`);
    }

    if (chosen) {
      planned.push({
        row,
        emp: chosen,
        docId: `${chosen.employeeId}${DOC_SUFFIX}`,
        staleId: `${chosen.employeeId}${STALE_SUFFIX}`,
        payload: {
          employeeId: chosen.employeeId,
          year: YEAR,
          casual: { total: row.casualTotal, used: row.casualUsed },
          wfh: { total: 0, used: row.wfhUsed },
        },
      });
    }
  }

  console.log('\nPlanned writes:\n');
  console.log('  ' + 'Employee'.padEnd(20) + 'employeeId'.padEnd(24) + 'Casual'.padEnd(10) + 'WFH'.padEnd(8) + 'Remaining');
  for (const p of planned) {
    const rem = p.row.casualTotal - p.row.casualUsed;
    console.log(
      '  ' +
      p.emp.displayName.padEnd(20) +
      p.emp.employeeId.padEnd(24) +
      `${p.row.casualUsed}/${p.row.casualTotal}`.padEnd(10) +
      `${p.row.wfhUsed}`.padEnd(8) +
      `${rem}`,
    );
  }

  if (problems.length) {
    console.log('\nIssues:\n');
    for (const pr of problems) console.log('  ⚠  ' + pr);
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`${planned.length} will be written, ${ROWS.length - planned.length} skipped (of ${ROWS.length} rows).`);

  if (DRY_RUN) {
    console.log('\nDry run complete — no writes made.\n');
    process.exit(0);
  }

  if (planned.length === 0) {
    console.log('\nNothing to write.\n');
    process.exit(0);
  }

  console.log(`\nWriting to ${DOC_SUFFIX} docs (merge — preserves Privilege/Marriage/Medical/Unpaid)…`);
  const batch = db.batch();
  for (const p of planned) {
    batch.set(db.collection('hr_leave_balances').doc(p.docId), p.payload, { merge: true });
  }
  await batch.commit();

  // Remove stale plain calendar-year docs (_2026) left from the pre-FY write.
  const staleSnaps = await db.getAll(...planned.map((p) => db.collection('hr_leave_balances').doc(p.staleId)));
  const stale = staleSnaps.filter((s) => s.exists);
  if (stale.length) {
    const delBatch = db.batch();
    for (const s of stale) delBatch.delete(s.ref);
    await delBatch.commit();
    console.log(`Cleaned up ${stale.length} stale ${STALE_SUFFIX} doc(s).`);
  }

  console.log(`\n✓ Done. ${planned.length} leave balance(s) written to FY${YEAR} (${YEAR}-${YEAR + 1}).\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

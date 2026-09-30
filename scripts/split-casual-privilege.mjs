/**
 * One-off: the seed-*-leave scripts wrote the sheet's whole 18-day total into the
 * Casual pool and left Privilege unset — which the app then defaults to 9, so those
 * employees saw 27 days. Company policy is 18 = 9 Casual + 9 Privilege.
 *
 * For every FY2026 balance with casual.total === 18 and no privilege pool:
 *   casual    → { total: 9, used: min(used, 9) }
 *   privilege → { total: 9, used: the remainder beyond 9 (capped at 9) }
 *   anything still left over is added to unpaid (none expected — existing
 *   LOP is already recorded in unpaid).
 *
 * Other totals (15, 24) and docs that already have a privilege pool are untouched.
 *
 * Dry-run:  node scripts/split-casual-privilege.mjs --dry-run
 * Apply:    node scripts/split-casual-privilege.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const FY = 2026;
const SPLIT = 9;

const __dir = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({ ...sa, privateKey: sa.private_key.replace(/\\n/g, '\n') }),
});
const db = admin.firestore();

async function main() {
  console.log(`\nProject: ${sa.project_id} | FY${FY} | ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log('─'.repeat(78));

  const names = new Map((await db.collection('hr_employees').get()).docs.map((d) => [d.data().employeeId, d.data().displayName]));
  const snap = await db.collection('hr_leave_balances').where('year', '==', FY).get();

  const writes = [];
  for (const doc of snap.docs) {
    if (!doc.id.endsWith(`_FY${FY}`)) continue;
    const x = doc.data();
    if (x.casual?.total !== 2 * SPLIT || x.privilege) continue;

    const used = x.casual.used ?? 0;
    const casualUsed = Math.min(used, SPLIT);
    const privilegeUsed = Math.min(Math.max(0, used - SPLIT), SPLIT);
    const overflow = used - casualUsed - privilegeUsed;
    const payload = {
      casual: { total: SPLIT, used: casualUsed },
      privilege: { total: SPLIT, used: privilegeUsed },
    };
    if (overflow > 0) payload.unpaid = { total: 0, used: (x.unpaid?.used ?? 0) + overflow };
    writes.push({ ref: doc.ref, payload, name: names.get(x.employeeId) ?? x.employeeId, used, overflow });
  }

  console.log('  ' + 'Employee'.padEnd(24) + 'Casual before'.padEnd(16) + 'Casual after'.padEnd(15) + 'Privilege after');
  for (const w of writes.sort((a, b) => b.used - a.used)) {
    console.log(
      '  ' + w.name.padEnd(24) + `${w.used}/18`.padEnd(16) + `${w.payload.casual.used}/9`.padEnd(15) +
      `${w.payload.privilege.used}/9` + (w.overflow ? `  (+${w.overflow} unpaid)` : ''),
    );
  }
  console.log('─'.repeat(78));
  console.log(`${writes.length} balance(s) to split.`);

  if (DRY_RUN) { console.log('\nDry run complete — no writes made.\n'); process.exit(0); }

  let batch = db.batch();
  let n = 0;
  for (const w of writes) {
    batch.set(w.ref, w.payload, { merge: true });
    if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (n % 400) await batch.commit();
  console.log(`\n✓ Done. ${writes.length} balance(s) updated.\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

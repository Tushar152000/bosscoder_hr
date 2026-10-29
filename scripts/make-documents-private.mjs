/**
 * One-off: switch every already-uploaded personal document (Aadhaar, PAN,
 * marksheets…) in Cloud Storage from public to private, and record its storage
 * path. New uploads are private already; files are opened through the portal's
 * /api/documents route, which checks access.
 *
 * Run AFTER the code that serves /api/documents is deployed — until then the
 * live site links straight to the public storage URLs.
 *
 * Dry-run:  node --env-file=.env.local scripts/make-documents-private.mjs --dry-run
 * Apply:    node --env-file=.env.local scripts/make-documents-private.mjs
 */
import admin from 'firebase-admin';

const DRY = process.argv.includes('--dry-run');
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert({ ...sa, privateKey: sa.private_key.replace(/\\n/g, '\n') }),
  storageBucket: `${sa.project_id}.appspot.com`, // same bucket as src/lib/firebase/admin.ts
});
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'https://storage.googleapis.com/';

const pathOf = (d) => {
  if (d.storagePath) return d.storagePath;
  const url = d.fileUrl ?? '';
  if (!url.startsWith(PREFIX)) return null;
  const rest = url.slice(PREFIX.length).split('?')[0];
  return rest.slice(rest.indexOf('/') + 1) || null;
};

const docs = (await db.collection('hr_documents').get()).docs;
let madePrivate = 0, alreadyPrivate = 0, missing = 0;
for (const d of docs) {
  const data = d.data();
  const path = pathOf(data);
  if (!path) { missing++; console.log('no storage path:', d.id); continue; }
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) { missing++; console.log('file missing:', path); continue; }
  const [isPublic] = await file.isPublic();
  if (!isPublic) alreadyPrivate++; else madePrivate++;
  if (DRY) continue;
  if (isPublic) await file.makePrivate();
  await d.ref.update({
    storagePath: path,
    fileUrl: `/api/documents/${encodeURIComponent(data.uid)}/${encodeURIComponent(data.docType)}`,
  });
}
console.log({ documents: docs.length, [DRY ? 'wouldMakePrivate' : 'madePrivate']: madePrivate, alreadyPrivate, missing, dryRun: DRY });

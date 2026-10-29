import 'server-only';
import { adminDb, adminStorage, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { docFirestoreId, type DocumentType } from '@/lib/firestore/documents';
import { documentHref, pendingOwnerKey } from '@/lib/documents-config';

/**
 * Personal documents (Aadhaar, PAN, marksheets…) live in Cloud Storage as PRIVATE
 * objects. Nobody gets a storage URL — files are opened through
 * /api/documents/<uid>/<docType>, which checks who's asking.
 */

export const DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const PUBLIC_PREFIX = 'https://storage.googleapis.com/';

/** Storage path of a document record — older records only kept the public URL. */
export function storagePathOf(data: { storagePath?: string; fileUrl?: string }): string | null {
  if (data.storagePath) return data.storagePath;
  const url = data.fileUrl ?? '';
  if (!url.startsWith(PUBLIC_PREFIX)) return null;
  // https://storage.googleapis.com/<bucket>/<path>?…
  const rest = url.slice(PUBLIC_PREFIX.length).split('?')[0]!;
  return rest.slice(rest.indexOf('/') + 1) || null;
}

/** Save (or replace) one of `uid`'s documents. Returns the in-portal link. */
export async function saveDocument(args: { uid: string; docType: DocumentType; file: File }): Promise<string> {
  const { uid, docType, file } = args;
  if (!file || file.size === 0) throw new Error('No file provided');
  if (file.size > MAX_BYTES) throw new Error('File too large — max 10 MB');
  if (!DOCUMENT_MIME_TYPES.includes(file.type)) throw new Error('Only JPG, PNG, WEBP or PDF files are allowed');

  const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
  const storagePath = `hr/documents/${uid}/${docType}.${ext}`;
  const bucket = adminStorage.bucket();
  await bucket.file(storagePath).save(Buffer.from(await file.arrayBuffer()), {
    metadata: { contentType: file.type },
    private: true,
  });

  const ref = adminDb.collection(HR.documents).doc(docFirestoreId(uid, docType));
  const prev = await ref.get();
  const prevPath = prev.exists ? storagePathOf(prev.data()!) : null;
  // A replacement with a different extension leaves the old object behind — remove it.
  if (prevPath && prevPath !== storagePath) await bucket.file(prevPath).delete().catch(() => {});

  await ref.set({
    uid,
    docType,
    fileName: file.name,
    storagePath,
    fileUrl: documentHref(uid, docType),
    contentType: file.type,
    uploadedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return documentHref(uid, docType);
}

/**
 * Documents uploaded before the employee's first sign-in are stored under a
 * placeholder (pendingOwnerKey). Move them to the login so they show in the
 * employee's own Settings → Account and everywhere else. A document the login
 * already has is kept if it's newer.
 */
export async function adoptPendingDocuments(employeeId: string, uid: string): Promise<void> {
  const pending = pendingOwnerKey(employeeId);
  const snap = await adminDb.collection(HR.documents).where('uid', '==', pending).get();
  if (snap.empty) return;
  const bucket = adminStorage.bucket();

  for (const d of snap.docs) {
    const data = d.data();
    const docType = data.docType as DocumentType;
    const fromPath = storagePathOf(data);
    const targetRef = adminDb.collection(HR.documents).doc(docFirestoreId(uid, docType));
    const existing = await targetRef.get();
    const existingAt = existing.exists ? (existing.data()!.updatedAt?.toMillis?.() ?? 0) : -1;
    const pendingAt = data.updatedAt?.toMillis?.() ?? 0;

    if (fromPath && pendingAt > existingAt) {
      const ext = fromPath.split('.').pop() ?? 'pdf';
      const toPath = `hr/documents/${uid}/${docType}.${ext}`;
      await bucket.file(fromPath).move(toPath);
      const oldPath = existing.exists ? storagePathOf(existing.data()!) : null;
      if (oldPath && oldPath !== toPath) await bucket.file(oldPath).delete().catch(() => {});
      await targetRef.set({ ...data, uid, storagePath: toPath, fileUrl: documentHref(uid, docType) });
    } else if (fromPath) {
      await bucket.file(fromPath).delete().catch(() => {});
    }
    await d.ref.delete();
  }
}

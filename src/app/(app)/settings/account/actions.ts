'use server';

import { requireUser } from '@/lib/auth/guard';
import { adminDb, adminStorage, adminAuth, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { docFirestoreId } from '@/lib/firestore/documents';
import type { DocumentType } from '@/lib/firestore/documents';
import { revalidatePath } from 'next/cache';

export async function updateDobAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const month = formData.get('month') as string | null;
  const day = formData.get('day') as string | null;
  if (!month || !day) throw new Error('Month and day are required');

  const mm = String(parseInt(month, 10)).padStart(2, '0');
  const dd = String(parseInt(day, 10)).padStart(2, '0');

  if (parseInt(mm) < 1 || parseInt(mm) > 12) throw new Error('Invalid month');
  if (parseInt(dd) < 1 || parseInt(dd) > 31) throw new Error('Invalid day');

  const dateOfBirth = `${mm}-${dd}`;

  const snap = await adminDb
    .collection(HR.employees)
    .where('userUid', '==', user.uid)
    .limit(1)
    .get();
  if (snap.empty) throw new Error('No employee record linked to your account');

  await snap.docs[0].ref.update({
    dateOfBirth,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: user.uid,
  });

  revalidatePath('/settings/account');
  revalidatePath('/');
}

const ALLOWED_DOC_TYPES: DocumentType[] = [
  'aadhaar',
  'pan',
  'marksheet_10',
  'marksheet_12',
  'degree',
  'signed_offer_letter',
  'signed_employment_contract',
];

export async function uploadAvatarAction(formData: FormData): Promise<{ url: string }> {
  const user = await requireUser();

  const file = formData.get('avatar') as File | null;
  if (!file || file.size === 0) throw new Error('No file provided');
  if (file.size > 5 * 1024 * 1024) throw new Error('File too large — max 5 MB');
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `hr/avatars/${user.uid}/profile.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(path);

  await fileRef.save(buffer, { metadata: { contentType: file.type } });
  await fileRef.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${path}`;

  await Promise.all([
    adminDb.collection(HR.users).doc(user.uid).update({
      photoURL: url,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    adminAuth.updateUser(user.uid, { photoURL: url }),
  ]);

  revalidatePath('/', 'layout');
  return { url };
}

export async function uploadDocumentAction(formData: FormData): Promise<{ url: string }> {
  const user = await requireUser();

  const docType = formData.get('docType') as DocumentType | null;
  if (!docType || !ALLOWED_DOC_TYPES.includes(docType)) throw new Error('Invalid document type');

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('No file provided');
  if (file.size > 10 * 1024 * 1024) throw new Error('File too large — max 10 MB');

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) throw new Error('Only JPG, PNG, WEBP or PDF files are allowed');

  const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase();
  const storagePath = `hr/documents/${user.uid}/${docType}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(buffer, { metadata: { contentType: file.type } });
  await fileRef.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  const firestoreId = docFirestoreId(user.uid, docType);

  await adminDb.collection(HR.documents).doc(firestoreId).set({
    uid: user.uid,
    docType,
    fileName: file.name,
    fileUrl: url,
    contentType: file.type,
    uploadedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath('/settings/account');
  return { url };
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const docType = formData.get('docType') as DocumentType | null;
  if (!docType || !ALLOWED_DOC_TYPES.includes(docType)) throw new Error('Invalid document type');

  const firestoreId = docFirestoreId(user.uid, docType);
  const snap = await adminDb.collection(HR.documents).doc(firestoreId).get();

  if (snap.exists) {
    const data = snap.data()!;
    if (data.uid !== user.uid) throw new Error('Forbidden');

    // Best-effort delete from storage (multiple extensions possible)
    const bucket = adminStorage.bucket();
    for (const ext of ['pdf', 'jpg', 'jpeg', 'png', 'webp']) {
      const fileRef = bucket.file(`hr/documents/${user.uid}/${docType}.${ext}`);
      try { await fileRef.delete(); } catch { /* file may not exist for this ext */ }
    }

    await adminDb.collection(HR.documents).doc(firestoreId).delete();
  }

  revalidatePath('/settings/account');
}

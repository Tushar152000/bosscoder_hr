import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { documentHref } from '@/lib/documents-config';

export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'marksheet_10'
  | 'marksheet_12'
  | 'degree'
  | 'signed_offer_letter'
  | 'signed_employment_contract';

export interface HrDocument {
  id: string;
  uid: string;
  docType: DocumentType;
  fileName: string;
  fileUrl: string;
  contentType: string;
  uploadedAt: Date | null;
  updatedAt: Date | null;
}

function toDoc(id: string, data: FirebaseFirestore.DocumentData): HrDocument {
  const updated: Date | null = data.updatedAt?.toDate?.() ?? null;
  return {
    id,
    uid: data.uid,
    docType: data.docType as DocumentType,
    fileName: data.fileName,
    // Always the access-checked in-portal route, never a storage URL.
    fileUrl: documentHref(data.uid, data.docType, updated?.getTime()),
    contentType: data.contentType,
    uploadedAt: data.uploadedAt?.toDate?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.() ?? null,
  };
}

export function docFirestoreId(uid: string, docType: string) {
  return `${uid}_${docType}`;
}

export async function getDocumentsForUser(uid: string): Promise<HrDocument[]> {
  const snap = await adminDb
    .collection(HR.documents)
    .where('uid', '==', uid)
    .get();
  return snap.docs.map((d) => toDoc(d.id, d.data()));
}

export async function getAllDocuments(): Promise<HrDocument[]> {
  const snap = await adminDb
    .collection(HR.documents)
    .limit(2000)
    .get();
  return snap.docs.map((d) => toDoc(d.id, d.data()));
}

export async function getDocument(uid: string, docType: string): Promise<(HrDocument & { raw: FirebaseFirestore.DocumentData }) | null> {
  const snap = await adminDb.collection(HR.documents).doc(docFirestoreId(uid, docType)).get();
  if (!snap.exists) return null;
  return { ...toDoc(snap.id, snap.data()!), raw: snap.data()! };
}

/** Aadhaar / PAN records for a portal login, shaped for the profile & edit page. */
export async function getIdDocuments(uid: string | null): Promise<{
  docType: 'aadhaar' | 'pan';
  href: string;
  contentType: string;
  fileName: string;
  uploadedAt: string | null;
}[]> {
  if (!uid) return [];
  const docs = await getDocumentsForUser(uid);
  return docs
    .filter((d): d is HrDocument & { docType: 'aadhaar' | 'pan' } => d.docType === 'aadhaar' || d.docType === 'pan')
    .map((d) => ({
      docType: d.docType,
      href: d.fileUrl,
      contentType: d.contentType ?? '',
      fileName: d.fileName ?? d.docType,
      uploadedAt: (d.updatedAt ?? d.uploadedAt)?.toISOString() ?? null,
    }));
}

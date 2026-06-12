import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';

export type DocumentType = 'aadhaar' | 'pan' | 'marksheet_10' | 'marksheet_12';

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
  return {
    id,
    uid: data.uid,
    docType: data.docType as DocumentType,
    fileName: data.fileName,
    fileUrl: data.fileUrl,
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

import 'server-only';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';

export interface FeedbackEntry {
  id: string;
  uid: string;
  email: string;
  name: string;
  message: string;
  page: string;
  createdAt: Date | null;
}

export async function addFeedback(entry: Omit<FeedbackEntry, 'id' | 'createdAt'>): Promise<void> {
  await adminDb.collection(HR.feedback).add({ ...entry, createdAt: FieldValue.serverTimestamp() });
}

export async function listFeedback(limit = 200): Promise<FeedbackEntry[]> {
  const snap = await adminDb.collection(HR.feedback).orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      uid: x.uid,
      email: x.email,
      name: x.name,
      message: x.message,
      page: x.page,
      createdAt: x.createdAt?.toDate?.() ?? null,
    };
  });
}

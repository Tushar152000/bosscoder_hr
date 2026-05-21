import 'server-only';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import type { NavNotification } from '@/components/layout/top-navbar';

interface NotificationDoc {
  id: string;
  uid: string;
  title: string;
  href?: string;
  tone: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}

export async function writeNotificationsForReviewers(
  entries: { uid: string; title: string; href?: string; tone: 'info' | 'success' | 'warning' }[]
): Promise<void> {
  if (entries.length === 0) return;
  let batch = adminDb.batch();
  let ops = 0;
  for (const e of entries) {
    const ref = adminDb.collection(HR.notifications).doc();
    batch.set(ref, {
      id: ref.id,
      uid: e.uid,
      title: e.title,
      ...(e.href ? { href: e.href } : {}),
      tone: e.tone,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    ops++;
    if (ops === 450) {
      await batch.commit();
      batch = adminDb.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

export async function listNotificationsForUser(uid: string): Promise<NavNotification[]> {
  const snap = await adminDb
    .collection(HR.notifications)
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  return snap.docs.map((d) => {
    const data = d.data() as NotificationDoc;
    return {
      id: data.id,
      title: data.title,
      href: data.href,
      tone: data.tone,
      read: data.read,
      createdAt: data.createdAt.toDate(),
    };
  });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await adminDb
    .collection(HR.notifications)
    .where('uid', '==', uid)
    .where('read', '==', false)
    .get();
  if (snap.empty) return;
  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { read: true });
  }
  await batch.commit();
}

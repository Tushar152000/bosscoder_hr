import 'server-only';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import type {
  HrFeedbackCategory,
  HrFeedbackItem,
  HrFeedbackStatus,
} from '@/lib/hr-feedback/types';

const col = () => adminDb.collection(HR.hrFeedback);

const iso = (v: unknown): string | null => {
  const d = (v as FirebaseFirestore.Timestamp | undefined)?.toDate?.();
  return d ? d.toISOString() : null;
};

function toItem(id: string, x: FirebaseFirestore.DocumentData): HrFeedbackItem {
  const anonymous = !!x.anonymous;
  return {
    id,
    category: x.category,
    message: x.message,
    anonymous,
    uid: anonymous ? null : x.uid ?? null,
    name: anonymous ? null : x.name ?? null,
    email: anonymous ? null : x.email ?? null,
    designation: anonymous ? null : x.designation ?? null,
    department: anonymous ? null : x.department ?? null,
    status: x.status ?? 'new',
    response: x.response ?? null,
    respondedAt: iso(x.respondedAt),
    handledByName: x.handledByName ?? null,
    createdAt: iso(x.createdAt),
    updatedAt: iso(x.updatedAt),
  };
}

/**
 * Anonymous feedback is stored with no sender fields at all — not the uid,
 * name, email or department — so nobody can trace it back later.
 */
export async function addHrFeedback(input: {
  category: HrFeedbackCategory;
  message: string;
  anonymous: boolean;
  sender: { uid: string; name: string; email: string; designation: string | null; department: string | null };
}): Promise<string> {
  const ref = await col().add({
    category: input.category,
    message: input.message,
    anonymous: input.anonymous,
    ...(input.anonymous
      ? {}
      : {
          uid: input.sender.uid,
          name: input.sender.name,
          email: input.sender.email,
          designation: input.sender.designation,
          department: input.sender.department,
        }),
    status: 'new' satisfies HrFeedbackStatus,
    response: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Newest first. Filtering happens in the inbox, so no composite index is needed. */
export async function listHrFeedback(limit = 500): Promise<HrFeedbackItem[]> {
  const snap = await col().orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => toItem(d.id, d.data()));
}

/** The sender's own named feedback, newest first. */
export async function listMyHrFeedback(uid: string): Promise<HrFeedbackItem[]> {
  const snap = await col().where('uid', '==', uid).limit(100).get();
  return snap.docs
    .map((d) => toItem(d.id, d.data()))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function countNewHrFeedback(): Promise<number> {
  const snap = await col().where('status', '==', 'new').count().get();
  return snap.data().count;
}

export async function getHrFeedback(id: string): Promise<HrFeedbackItem | null> {
  const snap = await col().doc(id).get();
  return snap.exists ? toItem(snap.id, snap.data()!) : null;
}

export async function updateHrFeedback(
  id: string,
  patch: { status: HrFeedbackStatus; response: string | null; actorName: string; responseChanged: boolean },
): Promise<void> {
  await col().doc(id).update({
    status: patch.status,
    response: patch.response,
    handledByName: patch.actorName,
    updatedAt: FieldValue.serverTimestamp(),
    ...(patch.responseChanged ? { respondedAt: patch.response ? FieldValue.serverTimestamp() : null } : {}),
  });
}

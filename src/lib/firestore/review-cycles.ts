import 'server-only';
import { adminDb, FieldValue, Timestamp } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { buildCycleName, type Cadence, type ReviewCycle, type ReviewCycleStored } from '@/types/review';

const COL = HR.reviewCycles;

function tsToDate(ts: FirebaseFirestore.Timestamp | null | undefined): Date | null {
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

function toCycle(stored: ReviewCycleStored): ReviewCycle {
  return {
    cycleId: stored.cycleId,
    name: stored.name,
    cadence: stored.cadence,
    month: stored.month,
    quarter: stored.quarter,
    year: stored.year,
    status: stored.status,
    assignedAt: tsToDate(stored.assignedAt),
    openedAt: tsToDate(stored.openedAt),
    closedAt: tsToDate(stored.closedAt),
    dueDate: tsToDate(stored.dueDate),
    selfCount: stored.selfCount ?? 0,
    managerCount: stored.managerCount ?? 0,
    selfSubmittedCount: stored.selfSubmittedCount ?? 0,
    managerSubmittedCount: stored.managerSubmittedCount ?? 0,
    createdBy: stored.createdBy,
    createdAt: tsToDate(stored.createdAt as FirebaseFirestore.Timestamp),
    updatedAt: tsToDate(stored.updatedAt as FirebaseFirestore.Timestamp),
  };
}

export async function listCycles(): Promise<ReviewCycle[]> {
  const snap = await adminDb
    .collection(COL)
    .orderBy('year', 'desc')
    .orderBy('month', 'desc')
    .orderBy('quarter', 'desc')
    .limit(120)
    .get();
  return snap.docs.map((d) => toCycle(d.data() as ReviewCycleStored));
}

export async function getCycle(cycleId: string): Promise<ReviewCycle | null> {
  const snap = await adminDb.collection(COL).doc(cycleId).get();
  if (!snap.exists) return null;
  return toCycle(snap.data() as ReviewCycleStored);
}

export async function createCycle(args: {
  cadence: Cadence;
  month: number | null;
  quarter: number | null;
  year: number;
  dueDate: Date | null;
  createdBy: string;
}): Promise<ReviewCycle> {
  const ref = adminDb.collection(COL).doc();
  const cycleId = ref.id;
  const name = buildCycleName(args);

  const data: Partial<ReviewCycleStored> = {
    cycleId,
    name,
    cadence: args.cadence,
    month: args.month,
    quarter: args.quarter,
    year: args.year,
    status: 'draft',
    assignedAt: null,
    openedAt: null,
    closedAt: null,
    dueDate: args.dueDate ? Timestamp.fromDate(args.dueDate) : null,
    selfCount: 0,
    managerCount: 0,
    selfSubmittedCount: 0,
    managerSubmittedCount: 0,
    createdBy: args.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(data);
  const fresh = await getCycle(cycleId);
  if (!fresh) throw new Error('Cycle creation failed');
  return fresh;
}

export async function setCycleStatus(
  cycleId: string,
  status: 'open' | 'closed',
  counts?: { selfCount: number; managerCount: number }
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (status === 'open') {
    update.openedAt = FieldValue.serverTimestamp();
    update.assignedAt = FieldValue.serverTimestamp();
    if (counts) {
      update.selfCount = counts.selfCount;
      update.managerCount = counts.managerCount;
    }
  } else if (status === 'closed') {
    update.closedAt = FieldValue.serverTimestamp();
  }
  await adminDb.collection(COL).doc(cycleId).update(update);
}

export async function updateCycleDueDate(
  cycleId: string,
  dueDate: Date | null,
): Promise<void> {
  await adminDb.collection(COL).doc(cycleId).update({
    dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function adjustCycleSubmittedCount(
  cycleId: string,
  kind: 'self' | 'manager',
  delta: number
): Promise<void> {
  const field = kind === 'self' ? 'selfSubmittedCount' : 'managerSubmittedCount';
  await adminDb
    .collection(COL)
    .doc(cycleId)
    .update({
      [field]: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

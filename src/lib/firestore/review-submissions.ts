import 'server-only';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { decryptOptional, encryptOptional } from '@/lib/crypto/encrypt';
import {
  computeManagerOverall,
  type ManagerEvalInput,
  type ReviewSubmission,
  type ReviewSubmissionStored,
  type SelfEvalInput,
  type SubmissionKind,
} from '@/types/review';
import type { EmployeePublic } from '@/types/employee';
import { adjustCycleSubmittedCount } from '@/lib/firestore/review-cycles';

const COL = HR.reviewSubmissions;

function tsToDate(ts: FirebaseFirestore.Timestamp | null | undefined): Date | null {
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

function toSubmission(
  stored: ReviewSubmissionStored,
  opts: { decryptNotes: boolean }
): ReviewSubmission {
  return {
    submissionId: stored.submissionId,
    cycleId: stored.cycleId,
    cycleName: stored.cycleName,
    kind: stored.kind,
    subjectEmployeeId: stored.subjectEmployeeId,
    subjectName: stored.subjectName,
    subjectEmail: stored.subjectEmail,
    subjectDepartment: stored.subjectDepartment,
    reviewerUid: stored.reviewerUid,
    reviewerEmployeeId: stored.reviewerEmployeeId,
    reviewerEmail: stored.reviewerEmail ?? '',
    reviewerName: stored.reviewerName,
    status: stored.status,
    selfAnswers: stored.selfAnswers,
    selfRatings: stored.selfRatings,
    managerRatings: stored.managerRatings,
    managerOverallRating: stored.managerOverallRating,
    managerNotes: opts.decryptNotes ? decryptOptional(stored.managerNotes) : null,
    submittedAt: tsToDate(stored.submittedAt),
    lockedAt: tsToDate(stored.lockedAt),
    createdAt: tsToDate(stored.createdAt as FirebaseFirestore.Timestamp),
    updatedAt: tsToDate(stored.updatedAt as FirebaseFirestore.Timestamp),
  };
}

export interface NewSubmissionInfo {
  submissionId: string;
  kind: 'self' | 'manager';
  reviewerName: string;
  reviewerEmail: string;
  /** Subject's name — for manager-evals this tells the reviewer who to evaluate. */
  subjectName: string;
}

/**
 * Generate review submissions for a cycle. Idempotent: re-running for the same
 * cycle skips employees who already have a self-eval and (employee, manager)
 * pairs that already have a manager-eval. Returns the counts created plus a
 * compact list of the new submissions (used to send notification emails).
 */
export async function generateSubmissionsForCycle(args: {
  cycleId: string;
  cycleName: string;
  employees: EmployeePublic[];
  employeesById: Map<string, EmployeePublic>;
}): Promise<{
  selfCreated: number;
  managerCreated: number;
  selfTotal: number;
  managerTotal: number;
  newSubmissions: NewSubmissionInfo[];
}> {
  const { cycleId, cycleName, employees, employeesById } = args;

  // Pull existing submissions for this cycle to skip duplicates.
  const existingSnap = await adminDb
    .collection(COL)
    .where('cycleId', '==', cycleId)
    .get();
  const existingSelf = new Set<string>();
  const existingManager = new Set<string>();
  for (const d of existingSnap.docs) {
    const s = d.data() as ReviewSubmissionStored;
    if (s.kind === 'self') existingSelf.add(s.subjectEmployeeId);
    else existingManager.add(`${s.subjectEmployeeId}::${s.reviewerEmployeeId ?? 'none'}`);
  }

  let selfCreated = 0;
  let managerCreated = 0;
  const newSubmissions: NewSubmissionInfo[] = [];
  let batch = adminDb.batch();
  let opsInBatch = 0;
  const flush = async () => {
    if (opsInBatch === 0) return;
    await batch.commit();
    batch = adminDb.batch();
    opsInBatch = 0;
  };

  for (const emp of employees) {
    if (!emp.active) continue;

    // Self-eval — one per employee.
    if (!existingSelf.has(emp.employeeId)) {
      const ref = adminDb.collection(COL).doc();
      const doc: Partial<ReviewSubmissionStored> = {
        submissionId: ref.id,
        cycleId,
        cycleName,
        kind: 'self',
        subjectEmployeeId: emp.employeeId,
        subjectName: emp.displayName,
        subjectEmail: emp.email,
        subjectDepartment: emp.department,
        reviewerUid: emp.userUid,
        reviewerEmployeeId: emp.employeeId,
        reviewerEmail: emp.email,
        reviewerName: emp.displayName,
        status: 'not-started',
        selfAnswers: null,
        selfRatings: null,
        managerRatings: null,
        managerOverallRating: null,
        managerNotes: null,
        submittedAt: null,
        lockedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.set(ref, doc);
      opsInBatch++;
      selfCreated++;
      newSubmissions.push({
        submissionId: ref.id,
        kind: 'self',
        reviewerName: emp.displayName,
        reviewerEmail: emp.email,
        subjectName: emp.displayName,
      });
      if (opsInBatch >= 450) await flush();
    }

    // Manager-eval — one per (employee, manager) pair when there IS a manager.
    if (emp.managerId) {
      const manager = employeesById.get(emp.managerId);
      if (manager) {
        const key = `${emp.employeeId}::${manager.employeeId}`;
        if (!existingManager.has(key)) {
          const ref = adminDb.collection(COL).doc();
          const doc: Partial<ReviewSubmissionStored> = {
            submissionId: ref.id,
            cycleId,
            cycleName,
            kind: 'manager',
            subjectEmployeeId: emp.employeeId,
            subjectName: emp.displayName,
            subjectEmail: emp.email,
            subjectDepartment: emp.department,
            reviewerUid: manager.userUid,
            reviewerEmployeeId: manager.employeeId,
            reviewerEmail: manager.email,
            reviewerName: manager.displayName,
            status: 'not-started',
            selfAnswers: null,
            selfRatings: null,
            managerRatings: null,
            managerOverallRating: null,
            managerNotes: null,
            submittedAt: null,
            lockedAt: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          batch.set(ref, doc);
          opsInBatch++;
          managerCreated++;
          newSubmissions.push({
            submissionId: ref.id,
            kind: 'manager',
            reviewerName: manager.displayName,
            reviewerEmail: manager.email,
            subjectName: emp.displayName,
          });
          if (opsInBatch >= 450) await flush();
        }
      }
    }
  }
  await flush();

  const selfTotal = existingSelf.size + selfCreated;
  const managerTotal = existingManager.size + managerCreated;
  return { selfCreated, managerCreated, selfTotal, managerTotal, newSubmissions };
}

export async function listSubmissionsForCycle(cycleId: string): Promise<ReviewSubmission[]> {
  const snap = await adminDb
    .collection(COL)
    .where('cycleId', '==', cycleId)
    .orderBy('subjectDepartment')
    .orderBy('subjectName')
    .get();
  // Notes are not decrypted in bulk listings; only the detail page decrypts when authorized.
  return snap.docs.map((d) =>
    toSubmission(d.data() as ReviewSubmissionStored, { decryptNotes: false })
  );
}

export async function listSubmissionsForReviewer(
  reviewerEmail: string,
  opts: { onlyOpen?: boolean } = {}
): Promise<ReviewSubmission[]> {
  // Email is the canonical reviewer key. uid may be null at submission-generation
  // time (employee hasn't signed in yet) but email is always known. We backfill
  // uid on first login (see lib/auth/claims.ts).
  let q: FirebaseFirestore.Query = adminDb
    .collection(COL)
    .where('reviewerEmail', '==', reviewerEmail.toLowerCase());
  if (opts.onlyOpen) q = q.where('status', 'in', ['not-started', 'in-progress']);
  const snap = await q.orderBy('cycleName', 'desc').orderBy('subjectName').get();
  return snap.docs.map((d) =>
    toSubmission(d.data() as ReviewSubmissionStored, { decryptNotes: false })
  );
}

/**
 * Find the self-eval submission for a (cycle, subject) pair. Used by the
 * manager-eval page so the manager can read the employee's reflection
 * answers inline before filling their rating.
 */
export async function findSelfEvalForCycleAndSubject(
  cycleId: string,
  subjectEmployeeId: string
): Promise<ReviewSubmission | null> {
  const snap = await adminDb
    .collection(COL)
    .where('cycleId', '==', cycleId)
    .where('subjectEmployeeId', '==', subjectEmployeeId)
    .where('kind', '==', 'self')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toSubmission(snap.docs[0].data() as ReviewSubmissionStored, {
    decryptNotes: false,
  });
}

/**
 * Submitted manager-evals where this employee is the SUBJECT, ordered oldest →
 * newest. Used by the home / performance dashboards to chart the user's rating
 * trajectory over time.
 */
export async function listSubmittedManagerEvalsForSubject(
  subjectEmployeeId: string
): Promise<ReviewSubmission[]> {
  const snap = await adminDb
    .collection(COL)
    .where('subjectEmployeeId', '==', subjectEmployeeId)
    .where('kind', '==', 'manager')
    .where('status', 'in', ['submitted', 'locked'])
    .get();
  const subs = snap.docs.map((d) =>
    toSubmission(d.data() as ReviewSubmissionStored, { decryptNotes: false })
  );
  // Sort by submission/lock time ASC. Falls back to createdAt for unsorted.
  subs.sort((a, b) => {
    const at = (a.submittedAt ?? a.lockedAt ?? a.createdAt)?.getTime() ?? 0;
    const bt = (b.submittedAt ?? b.lockedAt ?? b.createdAt)?.getTime() ?? 0;
    return at - bt;
  });
  return subs;
}

export async function getSubmission(
  submissionId: string,
  opts: { decryptNotes: boolean }
): Promise<ReviewSubmission | null> {
  const snap = await adminDb.collection(COL).doc(submissionId).get();
  if (!snap.exists) return null;
  return toSubmission(snap.data() as ReviewSubmissionStored, opts);
}

export async function getSubmissionStored(
  submissionId: string
): Promise<ReviewSubmissionStored | null> {
  const snap = await adminDb.collection(COL).doc(submissionId).get();
  if (!snap.exists) return null;
  return snap.data() as ReviewSubmissionStored;
}

/** Once a form is submitted (or locked), it is immutable. */
function ensureMutable(prev: ReviewSubmissionStored): void {
  if (prev.status === 'submitted') {
    throw new Error('This form has already been submitted and cannot be changed.');
  }
  if (prev.status === 'locked') {
    throw new Error('This cycle is closed. Form is read-only.');
  }
}

export async function saveSelfEval(args: {
  submissionId: string;
  input: SelfEvalInput;
  submit: boolean;
}): Promise<{ status: 'in-progress' | 'submitted' }> {
  const { submissionId, input, submit } = args;
  const ref = adminDb.collection(COL).doc(submissionId);
  const before = await ref.get();
  if (!before.exists) throw new Error('Submission not found');
  const prev = before.data() as ReviewSubmissionStored;
  if (prev.kind !== 'self') throw new Error('Wrong submission kind for self-eval');
  ensureMutable(prev);

  const update: Record<string, unknown> = {
    selfAnswers: input.answers,
    // Self-eval ratings are deprecated — always null on new writes.
    selfRatings: null,
    status: submit ? 'submitted' : 'in-progress',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (submit) update.submittedAt = FieldValue.serverTimestamp();

  await ref.update(update);

  if (submit) await adjustCycleSubmittedCount(prev.cycleId, 'self', 1);
  return { status: submit ? 'submitted' : 'in-progress' };
}

export async function saveManagerEval(args: {
  submissionId: string;
  input: ManagerEvalInput;
  submit: boolean;
}): Promise<{ status: 'in-progress' | 'submitted'; overall: number }> {
  const { submissionId, input, submit } = args;
  const ref = adminDb.collection(COL).doc(submissionId);
  const before = await ref.get();
  if (!before.exists) throw new Error('Submission not found');
  const prev = before.data() as ReviewSubmissionStored;
  if (prev.kind !== 'manager') throw new Error('Wrong submission kind for manager-eval');
  ensureMutable(prev);

  const overall = computeManagerOverall(input.ratings);

  const update: Record<string, unknown> = {
    managerRatings: input.ratings,
    managerOverallRating: overall,
    managerNotes: encryptOptional(input.notes),
    status: submit ? 'submitted' : 'in-progress',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (submit) update.submittedAt = FieldValue.serverTimestamp();

  await ref.update(update);

  if (submit) await adjustCycleSubmittedCount(prev.cycleId, 'manager', 1);
  return { status: submit ? 'submitted' : 'in-progress', overall };
}

/**
 * All manager-evals where this employee is the SUBJECT (any status).
 * Notes are decrypted so the employee can preview feedback inline.
 */
export async function listManagerEvalsForSubject(
  subjectEmployeeId: string,
): Promise<ReviewSubmission[]> {
  const snap = await adminDb
    .collection(COL)
    .where('subjectEmployeeId', '==', subjectEmployeeId)
    .where('kind', '==', 'manager')
    .get();
  const subs = snap.docs.map((d) =>
    toSubmission(d.data() as ReviewSubmissionStored, { decryptNotes: true }),
  );
  subs.sort((a, b) => {
    const at = (a.submittedAt ?? a.createdAt)?.getTime() ?? 0;
    const bt = (b.submittedAt ?? b.createdAt)?.getTime() ?? 0;
    return at - bt;
  });
  return subs;
}

export async function lockAllForCycle(cycleId: string): Promise<number> {
  const snap = await adminDb.collection(COL).where('cycleId', '==', cycleId).get();
  let batch = adminDb.batch();
  let opsInBatch = 0;
  let total = 0;
  for (const d of snap.docs) {
    const data = d.data() as ReviewSubmissionStored;
    if (data.status === 'locked') continue;
    batch.update(d.ref, {
      status: 'locked',
      lockedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    opsInBatch++;
    total++;
    if (opsInBatch >= 450) {
      await batch.commit();
      batch = adminDb.batch();
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) await batch.commit();
  return total;
}

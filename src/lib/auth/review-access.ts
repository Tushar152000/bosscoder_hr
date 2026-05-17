import 'server-only';
import type { CurrentUser } from '@/lib/auth/session';
import { isPrivileged } from '@/lib/auth/roles';
import {
  getDescendantEmployeeIds,
  getEmployeeByUserUid,
  listEmployees,
} from '@/lib/firestore/employees';
import type { ReviewSubmission } from '@/types/review';

/** Founders / HR with the right perm — can see + manage every cycle. */
export function canManageCycles(user: CurrentUser): boolean {
  return user.permissions.includes('manage_review_cycles') || isPrivileged(user.roles);
}

/** Departments this user manages at the leadership level (from their employee record). */
export async function getManagedDepartments(user: CurrentUser): Promise<string[]> {
  if (isPrivileged(user.roles)) return ['__all__'];
  const me = await getEmployeeByUserUid(user.uid);
  return me?.managedDepartments ?? [];
}

export function isAllAccess(deptList: string[]): boolean {
  return deptList.includes('__all__');
}

/**
 * Returns the set of `employeeId`s whose review forms `user` is allowed to *view*.
 * Returns `null` for "see everyone" (founder / HR / cycle managers).
 *
 * Includes:
 *   - own employeeId (always)
 *   - full org-tree subtree below user's own employee record
 *   - everyone in the user's `managedDepartments`
 */
export async function getViewableSubjectIds(
  user: CurrentUser
): Promise<Set<string> | null> {
  if (canManageCycles(user)) return null;

  const me = await getEmployeeByUserUid(user.uid);
  if (!me) return new Set();

  const set = new Set<string>([me.employeeId]);

  if (me.managedDepartments && me.managedDepartments.length > 0) {
    const inDepts = await listEmployees({ status: 'any', limit: 500 });
    for (const e of inDepts) {
      if (me.managedDepartments.includes(e.department)) set.add(e.employeeId);
    }
  }

  const descendants = await getDescendantEmployeeIds(me.employeeId);
  for (const id of descendants) set.add(id);

  return set;
}

function emailMatchesReviewer(user: CurrentUser, sub: ReviewSubmission): boolean {
  if (!sub.reviewerEmail) return false;
  return sub.reviewerEmail.toLowerCase() === user.email.toLowerCase();
}

function isReviewer(user: CurrentUser, sub: ReviewSubmission): boolean {
  if (sub.reviewerUid && sub.reviewerUid === user.uid) return true;
  return emailMatchesReviewer(user, sub);
}

/**
 * Can `user` view this submission?
 *
 *  - Founders / HR (cycle managers) — yes.
 *  - The reviewer — yes (their own work).
 *  - Self-eval where user IS the subject — yes (their own writeup).
 *  - Anyone in user's viewable-subject set (subtree + managed depts) — yes,
 *    EXCEPT for manager-evals where the subject is the user themselves.
 *
 * Hard rule: for a `kind: 'manager'` submission, the SUBJECT never sees their
 * own manager's rating of them (their boss's evaluation is private to the boss
 * + admins + the boss's chain).
 */
export async function canViewSubmission(
  user: CurrentUser,
  sub: ReviewSubmission
): Promise<boolean> {
  if (canManageCycles(user)) return true;
  if (isReviewer(user, sub)) return true;

  const me = await getEmployeeByUserUid(user.uid);

  // Self-eval: subject can always read their own.
  if (sub.kind === 'self') {
    if (me?.employeeId === sub.subjectEmployeeId) return true;
    if (sub.subjectEmail.toLowerCase() === user.email.toLowerCase()) return true;
  }

  if (!me) return false;

  // Manager-eval: the subject can see their own rating ONLY after it's been
  // submitted (or locked). While the manager is still drafting, it stays
  // private. Once submitted, the subject sees the rating + notes, which
  // also feeds their personal performance chart.
  if (sub.kind === 'manager' && sub.subjectEmployeeId === me.employeeId) {
    return sub.status === 'submitted' || sub.status === 'locked';
  }

  // Subtree + dept-lead visibility.
  const viewable = await getViewableSubjectIds(user);
  if (viewable === null) return true;
  return viewable.has(sub.subjectEmployeeId);
}

/**
 * Can the user fill / submit this form?
 *
 * Strict: ONLY the assigned reviewer can edit, ONLY while the form is
 * `not-started` or `in-progress`. Submitted forms are immutable — even
 * founders cannot reopen them. Locked (cycle-closed) forms are read-only.
 */
export async function canEditSubmission(
  _user: CurrentUser,
  sub: ReviewSubmission
): Promise<boolean> {
  if (sub.status === 'submitted' || sub.status === 'locked') return false;
  return isReviewer(_user, sub);
}

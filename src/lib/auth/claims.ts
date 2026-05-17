import 'server-only';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import {
  defaultPermissionsForRoles,
  founderEmails,
  type Permission,
  type Role,
} from '@/lib/auth/roles';

/**
 * Roles + permissions live in two places:
 *   1. Firestore (hr_users/{uid}) — source of truth, editable by HR via UI.
 *   2. Firebase Auth custom claims — fast read on every request via session cookie.
 *
 * Whenever roles/permissions change in Firestore, call `syncCustomClaims(uid)`
 * to refresh the claims. The user's next session refresh picks them up.
 */

export interface HrUserDoc {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  roles: Role[];
  permissions: Permission[];
  employeeId: string | null;
  active: boolean;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  lastLoginAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
}

export interface HrSessionClaims {
  hr: true;
  roles: Role[];
  perms: Permission[];
}

/**
 * Called on every login. If this is the first time we've seen the user:
 *   - bootstrap them as a `founder` if their email is in FOUNDER_EMAILS
 *   - otherwise create them as `employee` with no extra permissions
 * Always refreshes custom claims to match the Firestore record, and
 * (re-)links the user to their `hr_employees` record by email so any review
 * submissions waiting for them become visible immediately.
 */
export async function ensureUserAndSyncClaims(args: {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}): Promise<HrUserDoc> {
  const { uid, email, displayName, photoURL } = args;
  const lowerEmail = email.toLowerCase();
  const ref = adminDb.collection(HR.users).doc(uid);
  const snap = await ref.get();

  let doc: HrUserDoc;
  if (!snap.exists) {
    const isFounder = founderEmails().includes(lowerEmail);
    const roles: Role[] = isFounder ? ['founder'] : ['employee'];
    const permissions = defaultPermissionsForRoles(roles);
    doc = {
      uid,
      email,
      displayName,
      photoURL,
      roles,
      permissions,
      employeeId: null,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    };
    await ref.set(doc);
  } else {
    doc = snap.data() as HrUserDoc;
    await ref.update({
      email,
      displayName,
      photoURL,
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Always reconcile employee-link + submission backfill. Idempotent — bails
  // out fast when nothing needs fixing.
  const linkedEmployeeId = await linkEmployeeAndBackfillSubmissions({
    uid,
    email: lowerEmail,
    currentEmployeeId: doc.employeeId,
  });
  if (linkedEmployeeId && linkedEmployeeId !== doc.employeeId) {
    doc = { ...doc, employeeId: linkedEmployeeId };
  }

  await writeCustomClaims(uid, doc.roles, doc.permissions);
  return doc;
}

/**
 * Find the `hr_employees` record matching this user's email and:
 *   1. Set `userUid` on the employee record (if missing).
 *   2. Set `employeeId` on the user record (if missing).
 *   3. Backfill `reviewerUid` on every submission where `reviewerEmail`
 *      matches this user — so review forms generated *before* the user
 *      ever signed in show up in their dashboard.
 *
 * Returns the linked employeeId if one was found.
 */
async function linkEmployeeAndBackfillSubmissions(args: {
  uid: string;
  email: string;
  currentEmployeeId: string | null;
}): Promise<string | null> {
  const { uid, email, currentEmployeeId } = args;

  const empSnap = await adminDb
    .collection(HR.employees)
    .where('email', '==', email)
    .limit(1)
    .get();
  if (empSnap.empty) return currentEmployeeId;

  const empDoc = empSnap.docs[0];
  const emp = empDoc.data() as { employeeId: string; userUid: string | null };

  // 1. Ensure employee.userUid is set.
  if (emp.userUid !== uid) {
    await empDoc.ref.update({
      userUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // 2. Ensure hr_users.employeeId is set.
  if (currentEmployeeId !== emp.employeeId) {
    await adminDb.collection(HR.users).doc(uid).update({
      employeeId: emp.employeeId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // 3. Backfill submissions in two passes:
  //      a. by reviewerEmail — handles new submissions where uid was unknown.
  //      b. by reviewerEmployeeId — handles legacy submissions that pre-date
  //         the reviewerEmail field.
  let batch = adminDb.batch();
  let ops = 0;

  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = adminDb.batch();
      ops = 0;
    }
  };

  const byEmail = await adminDb
    .collection(HR.reviewSubmissions)
    .where('reviewerEmail', '==', email)
    .get();
  for (const d of byEmail.docs) {
    const data = d.data() as { reviewerUid: string | null };
    if (data.reviewerUid === uid) continue;
    batch.update(d.ref, {
      reviewerUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    ops++;
    if (ops >= 450) await flush();
  }

  const byEmployee = await adminDb
    .collection(HR.reviewSubmissions)
    .where('reviewerEmployeeId', '==', emp.employeeId)
    .get();
  for (const d of byEmployee.docs) {
    const data = d.data() as { reviewerUid: string | null; reviewerEmail?: string };
    const needsEmail = !data.reviewerEmail || data.reviewerEmail !== email;
    const needsUid = data.reviewerUid !== uid;
    if (!needsEmail && !needsUid) continue;
    batch.update(d.ref, {
      reviewerEmail: email,
      reviewerUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    ops++;
    if (ops >= 450) await flush();
  }

  await flush();
  return emp.employeeId;
}

export async function writeCustomClaims(
  uid: string,
  roles: Role[],
  permissions: Permission[]
): Promise<void> {
  const claims: HrSessionClaims = { hr: true, roles, perms: permissions };
  await adminAuth.setCustomUserClaims(uid, claims);
}

export async function syncCustomClaimsFromFirestore(uid: string): Promise<void> {
  const snap = await adminDb.collection(HR.users).doc(uid).get();
  if (!snap.exists) return;
  const data = snap.data() as HrUserDoc;
  await writeCustomClaims(uid, data.roles, data.permissions);
}

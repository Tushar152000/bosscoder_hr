import 'server-only';
import { adminAuth, adminDb, FieldValue, Timestamp } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { adoptPendingDocuments } from '@/lib/documents/files';
import {
  defaultPermissionsForRoles,
  founderEmails,
  hrEmails,
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
  /** User removed their photo — don't re-copy the Google picture on login. */
  photoRemoved?: boolean;
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
  /** Claims on the ID token being exchanged — lets us skip a no-op claims write. */
  tokenClaims?: { hr?: unknown; roles?: unknown; perms?: unknown };
}): Promise<{ doc: HrUserDoc; claimsChanged: boolean }> {
  const { uid, email, displayName, photoURL } = args;
  const lowerEmail = email.toLowerCase();
  const ref = adminDb.collection(HR.users).doc(uid);
  const snap = await ref.get();

  let doc: HrUserDoc;
  if (!snap.exists) {
    const isFounder = founderEmails().includes(lowerEmail);
    const isHr = !isFounder && hrEmails().includes(lowerEmail);
    const roles: Role[] = isFounder ? ['founder'] : isHr ? ['hr'] : ['employee'];
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
  }

  // Always reconcile employee-link + submission backfill. Idempotent — bails
  // out fast when nothing needs fixing. For an existing user it runs alongside
  // the last-login stamp (a new user's doc must exist first — `set` above).
  const link = linkEmployeeAndBackfillSubmissions({
    uid,
    email: lowerEmail,
    displayName: args.displayName,
    currentEmployeeId: doc.employeeId,
  });
  const [linkedEmployeeId] = await Promise.all([
    link,
    snap.exists &&
      ref.update({
        email,
        displayName,
        photoURL: doc.photoRemoved ? null : photoURL,
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
  ]);
  if (linkedEmployeeId && linkedEmployeeId !== doc.employeeId) {
    doc = { ...doc, employeeId: linkedEmployeeId };
  }

  // Skip the (slow) Auth write when the token already carries these exact claims.
  const claimsChanged = !claimsMatch(args.tokenClaims, doc.roles, doc.permissions);
  if (claimsChanged) await writeCustomClaims(uid, doc.roles, doc.permissions);
  return { doc, claimsChanged };
}

function sameSet(a: unknown, b: readonly string[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((x) => set.has(x));
}

/** True when the token's custom claims already equal what we'd write. */
export function claimsMatch(
  tokenClaims: { hr?: unknown; roles?: unknown; perms?: unknown } | undefined,
  roles: readonly string[],
  permissions: readonly string[],
): boolean {
  return (
    tokenClaims?.hr === true &&
    sameSet(tokenClaims.roles, roles) &&
    sameSet(tokenClaims.perms, permissions)
  );
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
function buildSearchTokens(displayName: string, email: string): string[] {
  const blob = `${displayName} ${email}`.toLowerCase();
  const words = blob.split(/[\s,@.]+/).filter(Boolean);
  const tokens = new Set<string>();
  for (const w of words) {
    for (let i = 1; i <= Math.min(w.length, 20); i++) tokens.add(w.slice(0, i));
  }
  return [...tokens];
}

async function linkEmployeeAndBackfillSubmissions(args: {
  uid: string;
  email: string;
  displayName: string | null;
  currentEmployeeId: string | null;
}): Promise<string | null> {
  const { uid, email, displayName, currentEmployeeId } = args;

  const empSnap = await adminDb
    .collection(HR.employees)
    .where('email', '==', email)
    .limit(1)
    .get();

  if (empSnap.empty) {
    // Auto-provision a stub employee so the person appears in the directory.
    // HR can fill in designation, department, etc. afterwards.
    const ref = adminDb.collection(HR.employees).doc();
    const name = displayName ?? email.split('@')[0];
    const tokens = buildSearchTokens(name, email);
    await ref.set({
      employeeId: ref.id,
      userUid: uid,
      displayName: name,
      email,
      personalEmail: null,
      phone: null,
      designation: '',
      department: '',
      managedDepartments: [],
      teamId: null,
      managerId: null,
      joiningDate: Timestamp.now(),
      employmentType: 'full-time',
      status: 'active',
      exitDate: null,
      active: true,
      searchTokens: tokens,
      compensation: { ctc: null, salary: null, bonus: null },
      bank: { accountNumber: null, ifsc: null, beneficiaryName: null },
      identity: { pan: null, aadhaar: null },
      address: { line1: null, line2: null, city: null, state: null, pincode: null },
      dob: null,
      emergencyContact: { name: null, phone: null },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'system',
      updatedBy: 'system',
    });
    await adminDb.collection(HR.users).doc(uid).update({
      employeeId: ref.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  const empDoc = empSnap.docs[0];
  const emp = empDoc.data() as { employeeId: string; userUid: string | null };

  // 1. Ensure employee.userUid is set, and 2. hr_users.employeeId is set —
  //    independent writes, run alongside the submission lookups below.
  const linkWrites = Promise.all([
    emp.userUid !== uid &&
      empDoc.ref.update({
        userUid: uid,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    currentEmployeeId !== emp.employeeId &&
      adminDb.collection(HR.users).doc(uid).update({
        employeeId: emp.employeeId,
        updatedAt: FieldValue.serverTimestamp(),
      }),
  ]);

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

  const [byEmail, byEmployee] = await Promise.all([
    adminDb.collection(HR.reviewSubmissions).where('reviewerEmail', '==', email).get(),
    adminDb.collection(HR.reviewSubmissions).where('reviewerEmployeeId', '==', emp.employeeId).get(),
  ]);
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

  await Promise.all([flush(), linkWrites]);
  // Aadhaar / PAN uploaded from the onboarding link before this first sign-in.
  if (emp.userUid !== uid) {
    await adoptPendingDocuments(emp.employeeId, uid).catch((e) =>
      console.error('[claims] moving onboarding documents failed', e),
    );
  }
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

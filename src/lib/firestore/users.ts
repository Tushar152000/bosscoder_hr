import 'server-only';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import type { Permission, Role } from '@/lib/auth/roles';
import type { HrUserDoc } from '@/lib/auth/claims';

const COL = HR.users;

export interface HrUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  roles: Role[];
  permissions: Permission[];
  employeeId: string | null;
  active: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastLoginAt: Date | null;
}

function tsToDate(ts: FirebaseFirestore.Timestamp | null | undefined): Date | null {
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

function toUser(stored: HrUserDoc): HrUser {
  return {
    uid: stored.uid,
    email: stored.email,
    displayName: stored.displayName,
    photoURL: stored.photoURL,
    roles: stored.roles ?? [],
    permissions: stored.permissions ?? [],
    employeeId: stored.employeeId ?? null,
    active: stored.active ?? true,
    createdAt: tsToDate(stored.createdAt as FirebaseFirestore.Timestamp),
    updatedAt: tsToDate(stored.updatedAt as FirebaseFirestore.Timestamp),
    lastLoginAt: tsToDate(stored.lastLoginAt as FirebaseFirestore.Timestamp),
  };
}

export async function listHrUsers(): Promise<HrUser[]> {
  const snap = await adminDb.collection(COL).orderBy('email').limit(500).get();
  return snap.docs.map((d) => toUser(d.data() as HrUserDoc));
}

export async function getHrUser(uid: string): Promise<HrUser | null> {
  const snap = await adminDb.collection(COL).doc(uid).get();
  if (!snap.exists) return null;
  return toUser(snap.data() as HrUserDoc);
}

export async function updateHrUserRolesAndPermissions(args: {
  uid: string;
  roles: Role[];
  permissions: Permission[];
}): Promise<void> {
  await adminDb.collection(COL).doc(args.uid).update({
    roles: args.roles,
    permissions: args.permissions,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setHrUserActive(uid: string, active: boolean): Promise<void> {
  await adminDb.collection(COL).doc(uid).update({
    active,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Hard-delete the hr_users doc. Caller is responsible for revoking the auth user separately. */
export async function deleteHrUserDoc(uid: string): Promise<void> {
  await adminDb.collection(COL).doc(uid).delete();
}

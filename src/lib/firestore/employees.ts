import 'server-only';
import { cache } from 'react';
import { adminDb, FieldValue, Timestamp } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { encryptOptional, decryptOptional } from '@/lib/crypto/encrypt';
import type {
  EmployeeFull,
  EmployeeInput,
  EmployeePublic,
  EmployeeSensitive,
  EmployeeStored,
} from '@/types/employee';

const COL = HR.employees;

/** Tokens for prefix search: every 1..N-character prefix of every word. */
function buildSearchTokens(input: { displayName: string; email: string; designation: string; department: string }): string[] {
  const blob = `${input.displayName} ${input.email} ${input.designation} ${input.department}`.toLowerCase();
  const words = blob.split(/[\s,@.]+/).filter(Boolean);
  const tokens = new Set<string>();
  for (const w of words) {
    for (let i = 1; i <= Math.min(w.length, 20); i++) {
      tokens.add(w.slice(0, i));
    }
  }
  return [...tokens];
}

function tsToDate(ts: FirebaseFirestore.Timestamp | null | undefined): Date | null {
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

function toPublic(stored: EmployeeStored): EmployeePublic {
  return {
    employeeId: stored.employeeId,
    userUid: stored.userUid,
    displayName: stored.displayName,
    email: stored.email,
    personalEmail: stored.personalEmail,
    phone: stored.phone,
    designation: stored.designation,
    department: stored.department,
    managedDepartments: stored.managedDepartments ?? [],
    teamId: stored.teamId,
    managerId: stored.managerId,
    joiningDate: tsToDate(stored.joiningDate) ?? new Date(0),
    employmentType: stored.employmentType,
    status: stored.status,
    exitDate: tsToDate(stored.exitDate),
    active: stored.active,
    dateOfBirth: stored.dateOfBirth,
    createdAt: tsToDate(stored.createdAt as FirebaseFirestore.Timestamp),
    updatedAt: tsToDate(stored.updatedAt as FirebaseFirestore.Timestamp),
  };
}

function toSensitive(stored: EmployeeStored): EmployeeSensitive {
  return {
    compensation: {
      ctc: decryptOptional(stored.compensation?.ctc),
      salary: decryptOptional(stored.compensation?.salary),
      bonus: decryptOptional(stored.compensation?.bonus),
    },
    bank: {
      accountNumber: decryptOptional(stored.bank?.accountNumber),
      ifsc: decryptOptional(stored.bank?.ifsc),
      beneficiaryName: decryptOptional(stored.bank?.beneficiaryName),
    },
    identity: {
      pan: decryptOptional(stored.identity?.pan),
      aadhaar: decryptOptional(stored.identity?.aadhaar),
    },
    address: {
      line1: decryptOptional(stored.address?.line1),
      line2: decryptOptional(stored.address?.line2),
      city: decryptOptional(stored.address?.city),
      state: decryptOptional(stored.address?.state),
      pincode: decryptOptional(stored.address?.pincode),
    },
    dob: decryptOptional(stored.dob),
    emergencyContact: {
      name: decryptOptional(stored.emergencyContact?.name),
      phone: decryptOptional(stored.emergencyContact?.phone),
    },
  };
}

function inputToStored(
  input: EmployeeInput,
  meta: { employeeId: string; createdBy: string; updatedBy: string; isCreate: boolean }
): Partial<EmployeeStored> {
  const joining = new Date(input.joiningDate);
  const exit = input.exitDate ? new Date(input.exitDate) : null;
  return {
    employeeId: meta.employeeId,
    userUid: input.userUid,
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    personalEmail: input.personalEmail?.trim().toLowerCase() || null,
    phone: input.phone.trim(),
    designation: input.designation.trim(),
    department: input.department.trim(),
    managedDepartments: (input.managedDepartments ?? []).map((d) => d.trim()).filter(Boolean),
    teamId: input.teamId,
    managerId: input.managerId,
    joiningDate: Timestamp.fromDate(joining),
    employmentType: input.employmentType,
    status: input.status,
    exitDate: exit ? Timestamp.fromDate(exit) : null,
    active: input.status !== 'left',
    searchTokens: buildSearchTokens({
      displayName: input.displayName,
      email: input.email,
      designation: input.designation,
      department: input.department,
    }),
    compensation: {
      ctc: encryptOptional(input.compensation.ctc),
      salary: encryptOptional(input.compensation.salary),
      bonus: encryptOptional(input.compensation.bonus),
    },
    bank: {
      accountNumber: encryptOptional(input.bank.accountNumber),
      ifsc: encryptOptional(input.bank.ifsc),
      beneficiaryName: encryptOptional(input.bank.beneficiaryName),
    },
    identity: {
      pan: encryptOptional(input.identity.pan),
      aadhaar: encryptOptional(input.identity.aadhaar),
    },
    address: {
      line1: encryptOptional(input.address.line1),
      line2: encryptOptional(input.address.line2),
      city: encryptOptional(input.address.city),
      state: encryptOptional(input.address.state),
      pincode: encryptOptional(input.address.pincode),
    },
    dob: encryptOptional(input.dob),
    dateOfBirth: input.dateOfBirth ?? null,
    emergencyContact: {
      name: encryptOptional(input.emergencyContact.name),
      phone: encryptOptional(input.emergencyContact.phone),
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: meta.updatedBy,
    ...(meta.isCreate
      ? { createdAt: FieldValue.serverTimestamp(), createdBy: meta.createdBy }
      : {}),
  };
}

async function _listEmployees(opts: {
  search?: string;
  status?: 'active' | 'on-notice' | 'left' | 'any';
  managerId?: string;
  limit?: number;
} = {}): Promise<EmployeePublic[]> {
  let q: FirebaseFirestore.Query = adminDb.collection(COL);

  // Use the indexed `active` boolean for the common case so we don't need a
  // composite (status, displayName) index. For non-default status filters,
  // fall back to the explicit `status` field.
  const status = opts.status ?? 'active';
  if (status === 'active') {
    q = q.where('active', '==', true);
  } else if (status === 'on-notice' || status === 'left') {
    q = q.where('status', '==', status);
  }
  // status === 'any' → no status/active filter

  if (opts.managerId) q = q.where('managerId', '==', opts.managerId);
  if (opts.search) {
    q = q.where('searchTokens', 'array-contains', opts.search.toLowerCase());
  }
  q = q.orderBy('displayName').limit(opts.limit ?? 200);

  const snap = await q.get();
  return snap.docs.map((d) => toPublic(d.data() as EmployeeStored));
}

/**
 * Per-request memoization: React `cache()` dedupes calls *within a single
 * request* by argument identity. So calling `listEmployees({ status: 'active' })`
 * three times during one page render hits Firestore only once.
 */
export const listEmployees = cache(_listEmployees);

async function _getEmployeeById(employeeId: string): Promise<EmployeePublic | null> {
  const snap = await adminDb.collection(COL).doc(employeeId).get();
  if (!snap.exists) return null;
  return toPublic(snap.data() as EmployeeStored);
}
export const getEmployeeById = cache(_getEmployeeById);

export async function getEmployeeFull(employeeId: string): Promise<EmployeeFull | null> {
  const snap = await adminDb.collection(COL).doc(employeeId).get();
  if (!snap.exists) return null;
  const stored = snap.data() as EmployeeStored;
  return { ...toPublic(stored), ...toSensitive(stored) };
}

async function _getEmployeeByUserUid(uid: string): Promise<EmployeePublic | null> {
  const snap = await adminDb.collection(COL).where('userUid', '==', uid).limit(1).get();
  if (snap.empty) return null;
  return toPublic(snap.docs[0].data() as EmployeeStored);
}
export const getEmployeeByUserUid = cache(_getEmployeeByUserUid);

async function _getAllEmployeesForTree(): Promise<EmployeePublic[]> {
  const snap = await adminDb.collection(COL).orderBy('displayName').get();
  return snap.docs.map((d) => toPublic(d.data() as EmployeeStored));
}
export const getAllEmployeesForTree = cache(_getAllEmployeesForTree);

export async function createEmployee(
  input: EmployeeInput,
  actorUid: string
): Promise<EmployeePublic> {
  const ref = adminDb.collection(COL).doc();
  const employeeId = ref.id;
  const data = inputToStored(input, {
    employeeId,
    createdBy: actorUid,
    updatedBy: actorUid,
    isCreate: true,
  });
  await ref.set(data);
  const created = await getEmployeeById(employeeId);
  if (!created) throw new Error('Created employee not found');
  return created;
}

export async function updateEmployee(
  employeeId: string,
  input: EmployeeInput,
  actorUid: string
): Promise<EmployeePublic> {
  const ref = adminDb.collection(COL).doc(employeeId);
  const exists = await ref.get();
  if (!exists.exists) throw new Error('Employee not found');
  const data = inputToStored(input, {
    employeeId,
    createdBy: actorUid,
    updatedBy: actorUid,
    isCreate: false,
  });
  await ref.update(data);
  const updated = await getEmployeeById(employeeId);
  if (!updated) throw new Error('Updated employee not found');
  return updated;
}

export async function deactivateEmployee(employeeId: string, actorUid: string): Promise<void> {
  await adminDb.collection(COL).doc(employeeId).update({
    status: 'left',
    active: false,
    exitDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUid,
  });
}

/** Hard-delete an employee record. Existing review submissions keep their
 *  denormalized name/email/department but lose the link to the employeeId. */
export async function deleteEmployee(employeeId: string): Promise<void> {
  await adminDb.collection(COL).doc(employeeId).delete();
}

/** All descendants of `rootEmployeeId` via the managerId chain (DFS, dedup). */
async function _getDescendantEmployeeIds(rootEmployeeId: string): Promise<Set<string>> {
  const all = await getAllEmployeesForTree();
  const childrenByManager = new Map<string, string[]>();
  for (const e of all) {
    if (e.managerId) {
      const list = childrenByManager.get(e.managerId) ?? [];
      list.push(e.employeeId);
      childrenByManager.set(e.managerId, list);
    }
  }
  const result = new Set<string>();
  const stack = [rootEmployeeId];
  while (stack.length) {
    const id = stack.pop()!;
    const children = childrenByManager.get(id) ?? [];
    for (const c of children) {
      if (!result.has(c)) {
        result.add(c);
        stack.push(c);
      }
    }
  }
  return result;
}
export const getDescendantEmployeeIds = cache(_getDescendantEmployeeIds);

export function emptyEmployeeInput(): EmployeeInput {
  return {
    displayName: '',
    email: '',
    personalEmail: null,
    phone: '',
    designation: '',
    department: '',
    managedDepartments: [],
    teamId: null,
    managerId: null,
    joiningDate: new Date().toISOString().slice(0, 10),
    employmentType: 'full-time',
    status: 'active',
    exitDate: null,
    userUid: null,
    compensation: { ctc: null, salary: null, bonus: null },
    bank: { accountNumber: null, ifsc: null, beneficiaryName: null },
    identity: { pan: null, aadhaar: null },
    address: { line1: null, line2: null, city: null, state: null, pincode: null },
    dob: null,
    dateOfBirth: null,
    emergencyContact: { name: null, phone: null },
  };
}

export function fullToInput(emp: EmployeeFull): EmployeeInput {
  return {
    displayName: emp.displayName,
    email: emp.email,
    personalEmail: emp.personalEmail,
    phone: emp.phone ?? '',
    designation: emp.designation,
    department: emp.department,
    managedDepartments: emp.managedDepartments ?? [],
    teamId: emp.teamId,
    managerId: emp.managerId,
    joiningDate: emp.joiningDate.toISOString().slice(0, 10),
    employmentType: emp.employmentType,
    status: emp.status,
    exitDate: emp.exitDate ? emp.exitDate.toISOString().slice(0, 10) : null,
    userUid: emp.userUid,
    compensation: { ...emp.compensation },
    bank: { ...emp.bank },
    identity: { ...emp.identity },
    address: { ...emp.address },
    dob: emp.dob,
    dateOfBirth: emp.dateOfBirth ?? null,
    emergencyContact: { ...emp.emergencyContact },
  };
}

export async function listEmployeesForBirthdays(): Promise<
  { employeeId: string; displayName: string; department: string; dateOfBirth: string }[]
> {
  const snap = await adminDb
    .collection(COL)
    .where('active', '==', true)
    .get();
  return snap.docs
    .map((d) => {
      const s = d.data() as EmployeeStored;
      return s.dateOfBirth
        ? { employeeId: s.employeeId, displayName: s.displayName, department: s.department, dateOfBirth: s.dateOfBirth }
        : null;
    })
    .filter(Boolean) as { employeeId: string; displayName: string; department: string; dateOfBirth: string }[];
}

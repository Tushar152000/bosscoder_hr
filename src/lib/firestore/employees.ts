import 'server-only';
import { cache } from 'react';
import { adminDb, FieldValue, Timestamp } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { encryptOptional, decryptOptional } from '@/lib/crypto/encrypt';
import type {
  AddressFields,
  EmployeeFull,
  EmployeeInput,
  EmployeePublic,
  EmployeeSensitive,
  EmployeeStored,
  FamilyFields,
  PreviousEmploymentFields,
} from '@/types/employee';
import type { OnboardingAnswers } from '@/types/onboarding';

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
    address: decryptAddress(stored.address),
    permanentAddress: decryptAddress(stored.permanentAddress),
    dob: decryptOptional(stored.dob),
    emergencyContact: {
      name: decryptOptional(stored.emergencyContact?.name),
      phone: decryptOptional(stored.emergencyContact?.phone),
      relation: decryptOptional(stored.emergencyContact?.relation ?? null),
    },
    family: {
      fatherName: decryptOptional(stored.family?.fatherName),
      fatherPhone: decryptOptional(stored.family?.fatherPhone),
      motherName: decryptOptional(stored.family?.motherName),
      motherPhone: decryptOptional(stored.family?.motherPhone),
    },
    uan: decryptOptional(stored.uan ?? null),
    previousEmployment: {
      company: decryptOptional(stored.previousEmployment?.company),
      managerName: decryptOptional(stored.previousEmployment?.managerName),
      managerPhone: decryptOptional(stored.previousEmployment?.managerPhone),
      managerEmail: decryptOptional(stored.previousEmployment?.managerEmail),
    },
  };
}

type StoredAddress = NonNullable<EmployeeStored['permanentAddress']>;

function decryptAddress(a: StoredAddress | null | undefined): AddressFields {
  return {
    line1: decryptOptional(a?.line1),
    line2: decryptOptional(a?.line2),
    city: decryptOptional(a?.city),
    state: decryptOptional(a?.state),
    pincode: decryptOptional(a?.pincode),
  };
}

function encryptAddress(a: AddressFields): StoredAddress {
  return {
    line1: encryptOptional(a.line1),
    line2: encryptOptional(a.line2),
    city: encryptOptional(a.city),
    state: encryptOptional(a.state),
    pincode: encryptOptional(a.pincode),
  };
}

function encryptFamily(f: FamilyFields): NonNullable<EmployeeStored['family']> {
  return {
    fatherName: encryptOptional(f.fatherName),
    fatherPhone: encryptOptional(f.fatherPhone),
    motherName: encryptOptional(f.motherName),
    motherPhone: encryptOptional(f.motherPhone),
  };
}

function encryptPreviousEmployment(p: PreviousEmploymentFields): NonNullable<EmployeeStored['previousEmployment']> {
  return {
    company: encryptOptional(p.company),
    managerName: encryptOptional(p.managerName),
    managerPhone: encryptOptional(p.managerPhone),
    managerEmail: encryptOptional(p.managerEmail),
  };
}

/** "YYYY-MM-DD" → "MM-DD" for the birthday field; null if it isn't a date. */
function birthdayOf(dob: string | null): string | null {
  return dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob.slice(5) : null;
}

/**
 * Firestore fields for a create/update.
 *  - Compensation and bank aren't collected any more: a new record gets empty
 *    values, an update never touches what's stored.
 *  - `includeSensitive: false` (an editor who can't see the encrypted fields, so
 *    the form sent them blank) leaves identity, addresses, DOB and emergency
 *    contact as stored instead of wiping them.
 */
function inputToStored(
  input: EmployeeInput,
  meta: { employeeId: string; createdBy: string; updatedBy: string; isCreate: boolean; includeSensitive: boolean }
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
    ...(meta.isCreate
      ? {
          compensation: { ctc: null, salary: null, bonus: null },
          bank: { accountNumber: null, ifsc: null, beneficiaryName: null },
        }
      : {}),
    ...(meta.isCreate || meta.includeSensitive
      ? {
          identity: {
            pan: encryptOptional(input.identity.pan),
            aadhaar: encryptOptional(input.identity.aadhaar),
          },
          address: encryptAddress(input.address),
          permanentAddress: encryptAddress(input.permanentAddress),
          dob: encryptOptional(input.dob),
          emergencyContact: {
            name: encryptOptional(input.emergencyContact.name),
            phone: encryptOptional(input.emergencyContact.phone),
            relation: encryptOptional(input.emergencyContact.relation),
          },
          ...(input.family ? { family: encryptFamily(input.family) } : {}),
          ...(input.uan !== undefined ? { uan: encryptOptional(input.uan) } : {}),
          ...(input.previousEmployment
            ? { previousEmployment: encryptPreviousEmployment(input.previousEmployment) }
            : {}),
        }
      : {}),
    ...(input.dateOfBirth != null
      ? { dateOfBirth: input.dateOfBirth }
      : meta.isCreate ? {} : { dateOfBirth: FieldValue.delete() as unknown as string }),
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
    includeSensitive: true,
  });
  await ref.set(data);
  const created = await getEmployeeById(employeeId);
  if (!created) throw new Error('Created employee not found');
  return created;
}

export async function updateEmployee(
  employeeId: string,
  input: EmployeeInput,
  actorUid: string,
  opts: { includeSensitive: boolean },
): Promise<EmployeePublic> {
  const ref = adminDb.collection(COL).doc(employeeId);
  const exists = await ref.get();
  if (!exists.exists) throw new Error('Employee not found');
  const data = inputToStored(input, {
    employeeId,
    createdBy: actorUid,
    updatedBy: actorUid,
    isCreate: false,
    includeSensitive: opts.includeSensitive,
  });
  await ref.update(data);
  const updated = await getEmployeeById(employeeId);
  if (!updated) throw new Error('Updated employee not found');
  return updated;
}

/**
 * Write what a joiner filled in on their onboarding link onto their record.
 * Only the fields the form asks for are touched; everything HR set stays.
 */
export async function applyOnboardingAnswers(employeeId: string, a: OnboardingAnswers): Promise<void> {
  const birthday = birthdayOf(a.dob);
  await adminDb.collection(COL).doc(employeeId).update({
    personalEmail: a.personalEmail?.trim().toLowerCase() || null,
    ...(a.phone ? { phone: a.phone.trim() } : {}),
    dob: encryptOptional(a.dob),
    ...(birthday ? { dateOfBirth: birthday } : {}),
    family: encryptFamily(a.family),
    emergencyContact: {
      name: encryptOptional(a.emergencyContact.name),
      phone: encryptOptional(a.emergencyContact.phone),
      relation: encryptOptional(a.emergencyContact.relation),
    },
    address: encryptAddress(a.address),
    permanentAddress: encryptAddress(a.permanentSame ? a.address : a.permanentAddress),
    identity: {
      pan: encryptOptional(a.pan?.toUpperCase() ?? null),
      aadhaar: encryptOptional(a.aadhaar),
    },
    uan: encryptOptional(a.noUan ? null : a.uan),
    previousEmployment: encryptPreviousEmployment(
      a.firstJob ? { company: null, managerName: null, managerPhone: null, managerEmail: null } : a.previousEmployment,
    ),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'onboarding-link',
  });
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
    identity: { pan: null, aadhaar: null },
    address: { line1: null, line2: null, city: null, state: null, pincode: null },
    permanentAddress: { line1: null, line2: null, city: null, state: null, pincode: null },
    dob: null,
    dateOfBirth: null,
    emergencyContact: { name: null, phone: null, relation: null },
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
    identity: { ...emp.identity },
    address: { ...emp.address },
    permanentAddress: { ...emp.permanentAddress },
    dob: emp.dob,
    dateOfBirth: emp.dateOfBirth ?? null,
    emergencyContact: { ...emp.emergencyContact },
    family: { ...emp.family },
    uan: emp.uan,
    previousEmployment: { ...emp.previousEmployment },
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

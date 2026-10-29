'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees, canViewSensitiveFor } from '@/lib/auth/employee-access';
import {
  createEmployee,
  deactivateEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
} from '@/lib/firestore/employees';
import { getHrUser, updateHrUserRolesAndPermissions } from '@/lib/firestore/users';
import { syncCustomClaimsFromFirestore } from '@/lib/auth/claims';
import { defaultPermissionsForRoles } from '@/lib/auth/roles';
import { writeAuditLog } from '@/lib/audit';
import type { EmployeeInput } from '@/types/employee';
import { isValidMobile } from '@/lib/phone';
import { recountCyclesForSubject } from '@/lib/firestore/review-submissions';
import { saveDocument } from '@/lib/documents/files';
import { documentOwnerKey } from '@/lib/documents-config';
import { deleteOnboarding } from '@/lib/firestore/onboarding';

/**
 * If an employee has no reporting manager → promote them to `manager` role.
 * If they already have a privileged role (founder/hr) don't downgrade it.
 */
async function syncRoleFromManagerId(
  userUid: string | null,
  hasManager: boolean,
  displayName: string,
): Promise<string | undefined> {
  if (!userUid) return undefined;
  const hrUser = await getHrUser(userUid);
  if (!hrUser) return undefined;

  const current = hrUser.roles;
  if (current.includes('founder') || current.includes('hr')) return undefined;

  const targetRole = hasManager ? 'employee' : 'manager';

  if (current.includes(targetRole) && current.length === 1) {
    return targetRole === 'manager'
      ? `${displayName} already has the Manager role.`
      : undefined;
  }

  const newRoles = [targetRole] as typeof current;
  const newPerms = defaultPermissionsForRoles(newRoles);
  await updateHrUserRolesAndPermissions({ uid: userUid, roles: newRoles, permissions: newPerms });
  await syncCustomClaimsFromFirestore(userUid);

  return targetRole === 'manager'
    ? `${displayName} has been promoted to Manager.`
    : `${displayName} role set to Employee.`;
}

const employmentTypeEnum = z.enum(['full-time', 'intern', 'contractor']);
const statusEnum = z.enum(['active', 'on-notice', 'left']);

const addressSchema = z.object({
  line1: z.string().max(200).nullable(),
  line2: z.string().max(200).nullable(),
  city: z.string().max(80).nullable(),
  state: z.string().max(80).nullable(),
  pincode: z.string().max(12).nullable(),
});

const employeeInputSchema = z.object({
  displayName: z.string().min(1, 'Name required').max(120),
  email: z.string().email().max(160),
  personalEmail: z.string().email().max(160).nullable(),
  phone: z.string().max(40).refine(isValidMobile, 'Enter a valid mobile number'),
  designation: z.string().min(1).max(120),
  department: z.string().min(1).max(80),
  managedDepartments: z.array(z.string().max(80)).default([]),
  teamId: z.string().nullable(),
  managerId: z.string().nullable(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  employmentType: employmentTypeEnum,
  status: statusEnum,
  exitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .nullable(),
  userUid: z.string().nullable(),
  identity: z.object({
    pan: z.string().nullable(),
    aadhaar: z.string().nullable(),
  }),
  address: addressSchema,
  permanentAddress: addressSchema,
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{2}-\d{2}$/, 'Use MM-DD')
    .nullable()
    .optional(),
  emergencyContact: z.object({
    name: z.string().max(120).nullable(),
    phone: z.string().max(40).nullable(),
    relation: z.string().max(60).nullable(),
  }),
  family: z
    .object({
      fatherName: z.string().max(120).nullable(),
      fatherPhone: z.string().max(40).nullable(),
      motherName: z.string().max(120).nullable(),
      motherPhone: z.string().max(40).nullable(),
    })
    .optional(),
  uan: z.string().max(16).nullable().optional(),
  previousEmployment: z
    .object({
      company: z.string().max(160).nullable(),
      managerName: z.string().max(120).nullable(),
      managerPhone: z.string().max(40).nullable(),
      managerEmail: z.string().max(160).nullable(),
    })
    .optional(),
});

export type ActionResult =
  | { ok: true; employeeId: string; roleMessage?: string }
  | { ok: false; error: string };

export async function createEmployeeAction(input: EmployeeInput): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };

  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const created = await createEmployee(parsed.data, user.uid);
    const roleMessage = await syncRoleFromManagerId(created.userUid, !!parsed.data.managerId, created.displayName);
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.create',
      resource: { type: 'employee', id: created.employeeId },
      metadata: { email: created.email, displayName: created.displayName },
    });
    revalidatePath('/directory');
    revalidatePath('/directory/tree');
    return { ok: true, employeeId: created.employeeId, roleMessage };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create' };
  }
}

export async function updateEmployeeAction(
  employeeId: string,
  input: EmployeeInput
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };

  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const existing = await getEmployeeById(employeeId);
    if (!existing) return { ok: false, error: 'Employee not found' };
    // Editors who can't see the encrypted fields got them blank in the form —
    // don't let their save wipe what's stored.
    const includeSensitive = await canViewSensitiveFor(user, existing);
    const updated = await updateEmployee(employeeId, parsed.data, user.uid, { includeSensitive });
    const roleMessage = await syncRoleFromManagerId(updated.userUid, !!parsed.data.managerId, updated.displayName);
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.update',
      resource: { type: 'employee', id: updated.employeeId },
    });
    revalidatePath('/directory');
    revalidatePath(`/directory/${employeeId}`);
    revalidatePath('/directory/tree');
    return { ok: true, employeeId: updated.employeeId, roleMessage };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update' };
  }
}

export async function deactivateEmployeeAction(employeeId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };

  try {
    await deactivateEmployee(employeeId, user.uid);
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.delete',
      resource: { type: 'employee', id: employeeId },
      metadata: { soft: true },
    });
    revalidatePath('/directory');
    revalidatePath(`/directory/${employeeId}`);
    revalidatePath('/directory/tree');
    return { ok: true, employeeId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to deactivate' };
  }
}

export async function deleteEmployeeAction(employeeId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };

  const target = await getEmployeeById(employeeId);
  if (!target) return { ok: false, error: 'Employee not found' };

  try {
    await deleteEmployee(employeeId);
    await deleteOnboarding(employeeId).catch(() => {});
    // Their review forms stay for the record but stop counting — refresh cycle totals.
    await recountCyclesForSubject(employeeId).catch(() => {});
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.delete',
      resource: { type: 'employee', id: employeeId },
      metadata: { soft: false, email: target.email, displayName: target.displayName },
    });
    revalidatePath('/directory');
    revalidatePath('/directory/tree');
    return { ok: true, employeeId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete' };
  }
}

export async function createAndRedirect(input: EmployeeInput): Promise<void> {
  const res = await createEmployeeAction(input);
  if (res.ok) redirect(`/directory/${res.employeeId}`);
}

export async function deleteAndRedirect(employeeId: string): Promise<void> {
  const res = await deleteEmployeeAction(employeeId);
  if (res.ok) redirect('/directory');
}

/** ID documents HR can upload for an employee (they can also upload their own). */
const HR_UPLOADABLE_DOCS = ['aadhaar', 'pan'] as const;

/**
 * Upload or replace an employee's Aadhaar / PAN picture. Stored against their
 * portal login, or held for them until their first sign-in.
 */
export async function uploadEmployeeIdDocumentAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };

  const employeeId = String(formData.get('employeeId') ?? '');
  const docType = String(formData.get('docType') ?? '') as (typeof HR_UPLOADABLE_DOCS)[number];
  if (!HR_UPLOADABLE_DOCS.includes(docType)) return { ok: false, error: 'Invalid document type' };

  const employee = await getEmployeeById(employeeId);
  if (!employee) return { ok: false, error: 'Employee not found' };
  if (!(await canViewSensitiveFor(user, employee))) return { ok: false, error: 'Forbidden' };

  try {
    const url = await saveDocument({ uid: documentOwnerKey(employee), docType, file: formData.get('file') as File });
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.update',
      resource: { type: 'employee', id: employeeId },
      metadata: { op: 'upload_document', docType },
    });
    revalidatePath(`/directory/${employeeId}`);
    revalidatePath(`/directory/${employeeId}/edit`);
    revalidatePath('/settings/employee-documents');
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

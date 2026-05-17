'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees } from '@/lib/auth/employee-access';
import {
  createEmployee,
  deactivateEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
} from '@/lib/firestore/employees';
import { writeAuditLog } from '@/lib/audit';
import type { EmployeeInput } from '@/types/employee';

const employmentTypeEnum = z.enum(['full-time', 'intern', 'contractor']);
const statusEnum = z.enum(['active', 'on-notice', 'left']);

const employeeInputSchema = z.object({
  displayName: z.string().min(1, 'Name required').max(120),
  email: z.string().email().max(160),
  personalEmail: z.string().email().max(160).nullable(),
  phone: z.string().min(7, 'Mobile number is required').max(40),
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
  compensation: z.object({
    ctc: z.string().nullable(),
    salary: z.string().nullable(),
    bonus: z.string().nullable(),
  }),
  bank: z.object({
    accountNumber: z.string().nullable(),
    ifsc: z.string().nullable(),
    beneficiaryName: z.string().nullable(),
  }),
  identity: z.object({
    pan: z.string().nullable(),
    aadhaar: z.string().nullable(),
  }),
  address: z.object({
    line1: z.string().nullable(),
    line2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    pincode: z.string().nullable(),
  }),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .nullable(),
  emergencyContact: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
  }),
});

export type ActionResult = { ok: true; employeeId: string } | { ok: false; error: string };

export async function createEmployeeAction(input: EmployeeInput): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };

  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const created = await createEmployee(parsed.data, user.uid);
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.create',
      resource: { type: 'employee', id: created.employeeId },
      metadata: { email: created.email, displayName: created.displayName },
    });
    revalidatePath('/directory');
    revalidatePath('/directory/tree');
    return { ok: true, employeeId: created.employeeId };
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
    const updated = await updateEmployee(employeeId, parsed.data, user.uid);
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.update',
      resource: { type: 'employee', id: updated.employeeId },
    });
    revalidatePath('/directory');
    revalidatePath(`/directory/${employeeId}`);
    revalidatePath('/directory/tree');
    return { ok: true, employeeId: updated.employeeId };
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

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees, canViewSensitiveFor } from '@/lib/auth/employee-access';
import { getEmployeeById } from '@/lib/firestore/employees';
import {
  getOnboarding,
  issueOnboardingLink,
  markChangesRequested,
  markVerified,
} from '@/lib/firestore/onboarding';
import { sendOnboardingChangesRequested, sendOnboardingInvite } from '@/lib/email/onboarding';
import { writeAuditLog } from '@/lib/audit';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function refresh(employeeId: string) {
  revalidatePath('/onboarding');
  revalidatePath(`/directory/${employeeId}`);
}

/**
 * Give an employee a (new) onboarding link. With `email`, it's also mailed to
 * `to`; either way HR gets the link back to copy into WhatsApp etc.
 */
export async function sendOnboardingAction(
  employeeId: string,
  opts: { to: string; email: boolean },
): Promise<Result<{ link: string; emailed: boolean; emailError?: string }>> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };
  const employee = await getEmployeeById(employeeId);
  if (!employee) return { ok: false, error: 'Employee not found' };

  const to = opts.to.trim().toLowerCase();
  if (opts.email && !z.string().email().safeParse(to).success) {
    return { ok: false, error: 'Enter a valid email to send the link to' };
  }

  try {
    const sentTo = to || employee.personalEmail || employee.email;
    const { link } = await issueOnboardingLink({ employeeId, sentTo, actorUid: user.uid });
    let emailed = false;
    let emailError: string | undefined;
    if (opts.email) {
      const record = await getOnboarding(employeeId);
      const res = await sendOnboardingInvite({
        to,
        name: employee.displayName,
        link,
        expiresAt: record?.expiresAt ? new Date(record.expiresAt) : new Date(),
        designation: employee.designation,
        department: employee.department,
        joiningDate: employee.joiningDate,
      });
      emailed = res.ok;
      emailError = res.error;
    }
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'onboarding.send',
      resource: { type: 'employee', id: employeeId },
      metadata: { sentTo, emailed },
    });
    refresh(employeeId);
    return { ok: true, link, emailed, emailError };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create the link' };
  }
}

/** HR checked the details and photos. Closes the link. */
export async function verifyOnboardingAction(employeeId: string): Promise<Result> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };
  const employee = await getEmployeeById(employeeId);
  if (!employee || !(await canViewSensitiveFor(user, employee))) return { ok: false, error: 'Forbidden' };

  await markVerified(employeeId, user.uid);
  await writeAuditLog({
    actorUid: user.uid,
    actorEmail: user.email,
    action: 'onboarding.verify',
    resource: { type: 'employee', id: employeeId },
  });
  refresh(employeeId);
  return { ok: true };
}

/** Send the form back to the joiner with a note; they're emailed the same link. */
export async function requestOnboardingChangesAction(employeeId: string, note: string): Promise<Result<{ emailed: boolean }>> {
  const user = await requireUser();
  if (!canEditEmployees(user)) return { ok: false, error: 'Forbidden' };
  const employee = await getEmployeeById(employeeId);
  if (!employee || !(await canViewSensitiveFor(user, employee))) return { ok: false, error: 'Forbidden' };
  const text = note.trim();
  if (!text) return { ok: false, error: 'Tell them what to change' };
  if (text.length > 1000) return { ok: false, error: 'Keep the note under 1000 characters' };

  const record = await getOnboarding(employeeId);
  if (!record?.link) return { ok: false, error: 'No open onboarding link — send a new one instead.' };

  await markChangesRequested(employeeId, text);
  const res = await sendOnboardingChangesRequested({
    to: record.sentTo,
    name: employee.displayName,
    link: record.link,
    note: text,
  });
  await writeAuditLog({
    actorUid: user.uid,
    actorEmail: user.email,
    action: 'onboarding.request_changes',
    resource: { type: 'employee', id: employeeId },
    metadata: { emailed: res.ok },
  });
  refresh(employeeId);
  return { ok: true, emailed: res.ok };
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { applyOnboardingAnswers, getEmployeeById } from '@/lib/firestore/employees';
import { findByToken, markSaved, markSubmitted } from '@/lib/firestore/onboarding';
import { getIdDocuments } from '@/lib/firestore/documents';
import { writeNotificationsForReviewers } from '@/lib/firestore/notifications';
import { saveDocument } from '@/lib/documents/files';
import { documentOwnerKey } from '@/lib/documents-config';
import { allErrors, normalizeAnswers } from '@/lib/onboarding/validate';
import { sendOnboardingSubmittedToHr } from '@/lib/email/onboarding';
import { writeAuditLog } from '@/lib/audit';
import type { OnboardingAnswers } from '@/types/onboarding';
import type { EmployeePublic } from '@/types/employee';

/**
 * Actions behind /join/<token> — the joiner isn't signed in, so every call
 * checks the token first, and only while the form is open (not submitted or
 * verified).
 */

type Result = { ok: true } | { ok: false; error: string };

const str = (max: number) => z.string().max(max).nullable();
const address = z.object({ line1: str(200), line2: str(200), city: str(80), state: str(80), pincode: str(12) });
const answersSchema = z.object({
  phone: str(40),
  personalEmail: str(160),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  family: z.object({ fatherName: str(120), fatherPhone: str(40), motherName: str(120), motherPhone: str(40) }),
  emergencyContact: z.object({ name: str(120), phone: str(40), relation: str(60) }),
  address,
  permanentSame: z.boolean(),
  permanentAddress: address,
  pan: str(12),
  aadhaar: str(16),
  uan: str(16),
  noUan: z.boolean(),
  firstJob: z.boolean(),
  previousEmployment: z.object({ company: str(160), managerName: str(120), managerPhone: str(40), managerEmail: str(160) }),
});

const EXPIRED = 'This link has expired or was replaced. Ask HR to send you a new one.';

type Opened = { ok: true; employee: EmployeePublic } | { ok: false; error: string };

async function openRecord(token: string): Promise<Opened> {
  const found = await findByToken(token);
  if (!found.ok) return { ok: false, error: EXPIRED };
  const { record } = found;
  if (record.status === 'submitted') return { ok: false, error: 'Your form is already submitted — HR is checking it.' };
  if (record.status === 'verified') return { ok: false, error: 'Your onboarding is complete.' };
  const employee = await getEmployeeById(record.employeeId);
  if (!employee) return { ok: false, error: EXPIRED };
  return { ok: true, employee };
}

async function save(
  token: string,
  input: OnboardingAnswers,
): Promise<{ ok: true; employee: EmployeePublic; answers: OnboardingAnswers } | { ok: false; error: string }> {
  const opened = await openRecord(token);
  if (!opened.ok) return opened;
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Some answers are too long or in the wrong format.' };
  const answers = normalizeAnswers(parsed.data);
  await applyOnboardingAnswers(opened.employee.employeeId, answers);
  return { ok: true, employee: opened.employee, answers };
}

/** Save progress (every "Next"). Format problems are fine here; submit checks them. */
export async function saveOnboardingAction(token: string, input: OnboardingAnswers): Promise<Result> {
  try {
    const saved = await save(token, input);
    if (!saved.ok) return saved;
    await markSaved(saved.employee.employeeId, { noUan: saved.answers.noUan, firstJob: saved.answers.firstJob });
    revalidatePath(`/directory/${saved.employee.employeeId}`);
    return { ok: true };
  } catch (e) {
    console.error('[onboarding] save failed', e);
    return { ok: false, error: "Couldn't save — check your connection and try again." };
  }
}

export async function uploadOnboardingDocumentAction(
  formData: FormData,
): Promise<{ ok: true; fileName: string; contentType: string } | { ok: false; error: string }> {
  const token = String(formData.get('token') ?? '');
  const docType = String(formData.get('docType') ?? '');
  if (docType !== 'aadhaar' && docType !== 'pan') return { ok: false, error: 'Invalid document' };
  const opened = await openRecord(token);
  if (!opened.ok) return opened;
  const file = formData.get('file') as File | null;
  try {
    await saveDocument({ uid: documentOwnerKey(opened.employee), docType, file: file! });
    revalidatePath(`/directory/${opened.employee.employeeId}`);
    return { ok: true, fileName: file!.name, contentType: file!.type };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

export async function submitOnboardingAction(token: string, input: OnboardingAnswers): Promise<Result> {
  try {
    const saved = await save(token, input);
    if (!saved.ok) return saved;
    const { employee, answers } = saved;

    const docs = await getIdDocuments(documentOwnerKey(employee));
    const errors = allErrors(answers, {
      aadhaar: docs.some((d) => d.docType === 'aadhaar'),
      pan: docs.some((d) => d.docType === 'pan'),
    });
    const first = Object.values(errors)[0];
    if (first) return { ok: false, error: first };

    await markSubmitted(employee.employeeId, { noUan: answers.noUan, firstJob: answers.firstJob });
    await writeAuditLog({
      actorUid: 'onboarding-link',
      actorEmail: employee.email,
      action: 'onboarding.submit',
      resource: { type: 'employee', id: employee.employeeId },
    }).catch(() => {});

    // Let HR know: in-portal notification + email.
    const hrSnap = await adminDb.collection(HR.users).where('roles', 'array-contains', 'hr').get();
    const hrUsers = hrSnap.docs
      .map((d) => d.data() as { uid: string; email: string; active?: boolean })
      .filter((u) => u.active !== false);
    await Promise.allSettled([
      writeNotificationsForReviewers(
        hrUsers.map((u) => ({
          uid: u.uid,
          title: `${employee.displayName} submitted their onboarding form — review it`,
          href: `/directory/${employee.employeeId}`,
          tone: 'info' as const,
        })),
      ),
      sendOnboardingSubmittedToHr({
        // One address can have several login records — email it once.
        to: [...new Set(hrUsers.map((u) => u.email).filter(Boolean))],
        name: employee.displayName,
        employeeId: employee.employeeId,
      }),
    ]);

    revalidatePath('/onboarding');
    revalidatePath(`/directory/${employee.employeeId}`);
    return { ok: true };
  } catch (e) {
    console.error('[onboarding] submit failed', e);
    return { ok: false, error: "Couldn't submit — check your connection and try again." };
  }
}

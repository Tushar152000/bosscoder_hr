'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import {
  canEditSubmission,
  canManageCycles,
} from '@/lib/auth/review-access';
import { writeAuditLog } from '@/lib/audit';
import {
  createCycle,
  getCycle,
  setCycleStatus,
  updateCycleDueDate,
} from '@/lib/firestore/review-cycles';
import {
  generateSubmissionsForCycle,
  getSubmission,
  lockAllForCycle,
  saveManagerEval,
  saveSelfEval,
  type NewSubmissionInfo,
} from '@/lib/firestore/review-submissions';
import { getAllEmployeesForTree } from '@/lib/firestore/employees';
import {
  sendCycleOpenEmails,
  type CycleOpenRecipient,
} from '@/lib/email/cycle-open';
import { writeNotificationsForReviewers } from '@/lib/firestore/notifications';
import { listSubmissionsForCycle } from '@/lib/firestore/review-submissions';
import type { Cadence, ManagerEvalInput, SelfEvalInput } from '@/types/review';

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

const cycleInputSchema = z
  .object({
    cadence: z.enum(['monthly', 'quarterly']),
    month: z.coerce.number().int().min(1).max(12).nullable(),
    quarter: z.coerce.number().int().min(1).max(4).nullable(),
    year: z.coerce.number().int().min(2024).max(2100),
  })
  .refine(
    (v) => (v.cadence === 'monthly' ? v.month !== null : v.quarter !== null),
    { message: 'Pick a month for monthly cycles or a quarter for quarterly cycles' }
  );

export async function createCycleAction(input: {
  cadence: Cadence;
  month: number | null;
  quarter: number | null;
  year: number;
  dueDate: string | null;
}): Promise<ActionResult<{ cycleId: string }>> {
  const user = await requireUser();
  if (!canManageCycles(user)) return { ok: false, error: 'Forbidden' };

  const parsed = cycleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const cycle = await createCycle({
      cadence: parsed.data.cadence,
      month: parsed.data.cadence === 'monthly' ? parsed.data.month : null,
      quarter: parsed.data.cadence === 'quarterly' ? parsed.data.quarter : null,
      year: parsed.data.year,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy: user.uid,
    });
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'review_cycle.create',
      resource: { type: 'review_cycle', id: cycle.cycleId },
      metadata: { name: cycle.name, cadence: cycle.cadence },
    });
    revalidatePath('/performance');
    return { ok: true, data: { cycleId: cycle.cycleId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create' };
  }
}

export async function updateCycleDueDateAction(
  cycleId: string,
  dueDate: string | null,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageCycles(user)) return { ok: false, error: 'Forbidden' };
  const cycle = await getCycle(cycleId);
  if (!cycle) return { ok: false, error: 'Cycle not found' };
  if (cycle.status === 'closed') return { ok: false, error: 'Cannot edit a closed cycle' };
  try {
    await updateCycleDueDate(cycleId, dueDate ? new Date(dueDate) : null);
    revalidatePath(`/performance/cycles/${cycleId}`);
    revalidatePath('/performance');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update' };
  }
}

export async function openCycleAction(cycleId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageCycles(user)) return { ok: false, error: 'Forbidden' };

  const cycle = await getCycle(cycleId);
  if (!cycle) return { ok: false, error: 'Cycle not found' };
  if (cycle.status === 'closed') return { ok: false, error: 'Cycle already closed' };

  try {
    const employees = await getAllEmployeesForTree();
    const byId = new Map(employees.map((e) => [e.employeeId, e]));
    const result = await generateSubmissionsForCycle({
      cycleId: cycle.cycleId,
      cycleName: cycle.name,
      employees,
      employeesById: byId,
    });
    await setCycleStatus(cycle.cycleId, 'open', {
      selfCount: result.selfTotal,
      managerCount: result.managerTotal,
    });

    // Best-effort notifications. Don't block / fail the cycle-open if email
    // delivery hits a snag — log the result via audit log.
    const emailResult = await dispatchCycleOpenEmails(cycle, result.newSubmissions);
    await dispatchCycleOpenNotifications(cycle.name, result.newSubmissions).catch(() => {});

    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'review_cycle.create',
      resource: { type: 'review_cycle', id: cycle.cycleId },
      metadata: {
        op: 'open',
        selfCreated: result.selfCreated,
        managerCreated: result.managerCreated,
        emailsAttempted: emailResult.attempted,
        emailsSent: emailResult.sent,
        emailsFailed: emailResult.failed,
      },
    });
    revalidatePath('/performance');
    revalidatePath(`/performance/cycles/${cycleId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to open cycle' };
  }
}

/**
 * Group newly-created submissions by reviewer email and send each reviewer ONE
 * consolidated email listing all the forms now waiting for them.
 */
async function dispatchCycleOpenEmails(
  cycle: { cycleId: string; name: string; cadence: Cadence },
  newSubmissions: NewSubmissionInfo[]
): Promise<{ attempted: number; sent: number; failed: number }> {
  if (newSubmissions.length === 0) {
    return { attempted: 0, sent: 0, failed: 0 };
  }

  const byReviewer = new Map<string, CycleOpenRecipient>();
  for (const s of newSubmissions) {
    if (!s.reviewerEmail) continue;
    const key = s.reviewerEmail.toLowerCase();
    let entry = byReviewer.get(key);
    if (!entry) {
      entry = {
        email: s.reviewerEmail,
        name: s.reviewerName,
        hasSelfEval: false,
        managerEvalSubjects: [],
      };
      byReviewer.set(key, entry);
    }
    if (s.kind === 'self') entry.hasSelfEval = true;
    else entry.managerEvalSubjects.push(s.subjectName);
  }

  const recipients = [...byReviewer.values()];
  return sendCycleOpenEmails({
    cycleId: cycle.cycleId,
    cycleName: cycle.name,
    cadence: cycle.cadence,
    recipients,
  });
}

async function dispatchCycleOpenNotifications(
  cycleName: string,
  newSubmissions: NewSubmissionInfo[]
): Promise<void> {
  const byUid = new Map<string, { hasSelf: boolean; managerCount: number }>();
  for (const s of newSubmissions) {
    if (!s.reviewerUid) continue;
    let entry = byUid.get(s.reviewerUid);
    if (!entry) {
      entry = { hasSelf: false, managerCount: 0 };
      byUid.set(s.reviewerUid, entry);
    }
    if (s.kind === 'self') entry.hasSelf = true;
    else entry.managerCount++;
  }

  const entries = [...byUid.entries()].map(([uid, { hasSelf, managerCount }]) => {
    let title: string;
    if (hasSelf && managerCount > 0) {
      title = `Your ${cycleName} evaluations are ready`;
    } else if (hasSelf) {
      title = `Your ${cycleName} self-evaluation is ready`;
    } else {
      title = `Team evaluation ready — ${cycleName}`;
    }
    return { uid, title, href: '/performance', tone: 'info' as const };
  });

  await writeNotificationsForReviewers(entries);
}

export async function syncCycleEmployeesAction(cycleId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageCycles(user)) return { ok: false, error: 'Forbidden' };

  const cycle = await getCycle(cycleId);
  if (!cycle) return { ok: false, error: 'Cycle not found' };
  if (cycle.status !== 'open') return { ok: false, error: 'Cycle is not open' };

  try {
    const employees = await getAllEmployeesForTree();
    const byId = new Map(employees.map((e) => [e.employeeId, e]));
    const result = await generateSubmissionsForCycle({
      cycleId: cycle.cycleId,
      cycleName: cycle.name,
      employees,
      employeesById: byId,
    });
    await setCycleStatus(cycle.cycleId, 'open', {
      selfCount: result.selfTotal,
      managerCount: result.managerTotal,
    });
    // Notify ONLY the people whose forms are brand new (existing reviewers
    // were already emailed when the cycle first opened).
    await dispatchCycleOpenEmails(cycle, result.newSubmissions);
    await dispatchCycleOpenNotifications(cycle.name, result.newSubmissions).catch(() => {});
    revalidatePath(`/performance/cycles/${cycleId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to sync' };
  }
}

export async function closeCycleAction(cycleId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageCycles(user)) return { ok: false, error: 'Forbidden' };

  try {
    await lockAllForCycle(cycleId);
    await setCycleStatus(cycleId, 'closed');
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'review_cycle.close',
      resource: { type: 'review_cycle', id: cycleId },
    });
    revalidatePath('/performance');
    revalidatePath(`/performance/cycles/${cycleId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to close' };
  }
}

const selfAnswers = (required: boolean) =>
  z.object({
    contributions: required ? z.string().min(1, 'Required').max(8000) : z.string().max(8000),
    upcomingDeliverables: required ? z.string().min(1, 'Required').max(8000) : z.string().max(8000),
    culturalPillars: required ? z.string().min(1, 'Required').max(8000) : z.string().max(8000),
    biggestChallenge: required ? z.string().min(1, 'Required').max(8000) : z.string().max(8000),
    learnedOrImproved: required ? z.string().min(1, 'Required').max(8000) : z.string().max(8000),
  });

const selfInputSchema = (required: boolean) => z.object({ answers: selfAnswers(required) });

const managerRatingSchema = z.coerce.number().min(1).max(5);
const managerInputSchema = z.object({
  ratings: z.object({
    tasksAchievement: managerRatingSchema,
    culturalRating: managerRatingSchema,
    newInitiatives: managerRatingSchema,
    takingFeedback: managerRatingSchema,
    reliability: managerRatingSchema,
  }),
  notes: z.string().max(8000).nullable(),
});

export async function saveSelfEvalAction(args: {
  submissionId: string;
  input: SelfEvalInput;
  submit: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const sub = await getSubmission(args.submissionId, { decryptNotes: false });
  if (!sub) return { ok: false, error: 'Submission not found' };
  if (sub.kind !== 'self') return { ok: false, error: 'Wrong form kind' };
  if (!(await canEditSubmission(user, sub))) return { ok: false, error: 'Forbidden' };

  const parsed = selfInputSchema(args.submit).safeParse(args.input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await saveSelfEval({
      submissionId: args.submissionId,
      input: parsed.data,
      submit: args.submit,
    });
    if (args.submit) {
      await writeAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'review.submit',
        resource: { type: 'review_submission', id: args.submissionId },
        metadata: { kind: 'self', cycleId: sub.cycleId },
      });
    }
    revalidatePath(`/performance/cycles/${sub.cycleId}`);
    revalidatePath(`/performance/submissions/${args.submissionId}`);
    revalidatePath('/performance');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function saveManagerEvalAction(args: {
  submissionId: string;
  input: ManagerEvalInput;
  submit: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const sub = await getSubmission(args.submissionId, { decryptNotes: false });
  if (!sub) return { ok: false, error: 'Submission not found' };
  if (sub.kind !== 'manager') return { ok: false, error: 'Wrong form kind' };
  if (!(await canEditSubmission(user, sub))) return { ok: false, error: 'Forbidden' };

  const parsed = managerInputSchema.safeParse(args.input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await saveManagerEval({
      submissionId: args.submissionId,
      input: parsed.data,
      submit: args.submit,
    });
    if (args.submit) {
      await writeAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'review.submit',
        resource: { type: 'review_submission', id: args.submissionId },
        metadata: { kind: 'manager', cycleId: sub.cycleId, subject: sub.subjectEmployeeId },
      });
    }
    revalidatePath(`/performance/cycles/${sub.cycleId}`);
    revalidatePath(`/performance/submissions/${args.submissionId}`);
    revalidatePath('/performance');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function createCycleAndRedirect(input: {
  cadence: Cadence;
  month: number | null;
  quarter: number | null;
  year: number;
  dueDate: string | null;
}): Promise<void> {
  const res = await createCycleAction(input);
  if (res.ok) redirect(`/performance/cycles/${res.data.cycleId}`);
}

/**
 * Send a nudge notification to all reviewers with pending (not-started /
 * in-progress) forms in the given cycle. Stub — wire up to notification
 * service when ready. Returns a user-facing message for the toast.
 */
/**
 * Employee-facing nudge: log that the employee asked their manager to complete
 * the evaluation. In future, wire up to an email/notification service.
 */
export async function sendManagerNudgeAction(
  managerEvalSubmissionId: string,
): Promise<ActionResult> {
  const user = await requireUser();

  const sub = await getSubmission(managerEvalSubmissionId, { decryptNotes: false });
  if (!sub) return { ok: false, error: 'Submission not found' };
  if (sub.kind !== 'manager') return { ok: false, error: 'Wrong form kind' };
  if (sub.subjectEmail.toLowerCase() !== user.email.toLowerCase())
    return { ok: false, error: 'Forbidden' };
  if (sub.status === 'submitted' || sub.status === 'locked')
    return { ok: false, error: 'Already reviewed' };

  try {
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'review.nudge_manager',
      resource: { type: 'review_submission', id: managerEvalSubmissionId },
      metadata: { cycleName: sub.cycleName, reviewerEmail: sub.reviewerEmail },
    });
    if (sub.reviewerUid) {
      await writeNotificationsForReviewers([{
        uid: sub.reviewerUid,
        title: `${sub.subjectName} is waiting for their ${sub.cycleName} evaluation`,
        href: '/performance',
        tone: 'warning',
      }]).catch(() => {});
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Nudge failed' };
  }
}

export async function nudgePendingEmployees(
  cycleId: string,
): Promise<ActionResult<{ sent: number }>> {
  const user = await requireUser();
  if (!canManageCycles(user)) return { ok: false, error: 'Forbidden' };

  const cycle = await getCycle(cycleId);
  if (!cycle) return { ok: false, error: 'Cycle not found' };
  if (cycle.status !== 'open') return { ok: false, error: 'Cycle is not open' };

  try {
    const allSubs = await listSubmissionsForCycle(cycleId);
    const pending = allSubs.filter(
      (s) => s.status === 'not-started' || s.status === 'in-progress',
    );
    const entries = [
      ...new Map(
        pending
          .filter((s) => s.reviewerUid)
          .map((s) => [
            s.reviewerUid!,
            {
              uid: s.reviewerUid!,
              title: `Reminder: your ${cycle.name} evaluation is waiting`,
              href: '/performance',
              tone: 'warning' as const,
            },
          ]),
      ).values(),
    ];
    await writeNotificationsForReviewers(entries).catch(() => {});

    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'review_cycle.nudge',
      resource: { type: 'review_cycle', id: cycleId },
      metadata: { cycleName: cycle.name, notified: entries.length },
    });
    return { ok: true, data: { sent: entries.length } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Nudge failed' };
  }
}

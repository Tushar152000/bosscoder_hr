'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { hasAnyRole } from '@/lib/auth/roles';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import { listHrUsers } from '@/lib/firestore/users';
import { writeNotificationsForReviewers } from '@/lib/firestore/notifications';
import { addHrFeedback, getHrFeedback, updateHrFeedback } from '@/lib/firestore/hr-feedback';
import { canManageHrFeedback } from '@/lib/hr-feedback/access';
import {
  CATEGORY_LABEL,
  HR_FEEDBACK_CATEGORIES,
  HR_FEEDBACK_STATUSES,
  MESSAGE_MAX,
  RESPONSE_MAX,
} from '@/lib/hr-feedback/types';

type Result = { ok: true } | { ok: false; error: string };

const submitSchema = z.object({
  category: z.enum(HR_FEEDBACK_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(10, 'Write a little more so HR can act on it')
    .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters`),
  anonymous: z.boolean(),
});

/** Anyone signed in can write to HR, with or without their name. */
export async function submitHrFeedbackAction(input: z.input<typeof submitSchema>): Promise<Result> {
  const user = await requireUser();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your message' };

  const { category, message, anonymous } = parsed.data;
  const me = anonymous ? null : await getEmployeeByUserUid(user.uid);
  await addHrFeedback({
    category,
    message,
    anonymous,
    sender: {
      uid: user.uid,
      name: user.displayName ?? me?.displayName ?? user.email,
      email: user.email,
      designation: me?.designation ?? null,
      department: me?.department ?? null,
    },
  });

  // Tell the HR team. Never name the sender in the notification.
  try {
    const hrUsers = await listHrUsers();
    await writeNotificationsForReviewers(
      hrUsers
        .filter((u) => u.active && hasAnyRole(u.roles, 'hr') && u.uid !== user.uid)
        .map((u) => ({
          uid: u.uid,
          title: `New feedback for HR · ${CATEGORY_LABEL[category]}`,
          href: '/hr-feedback/inbox',
          tone: 'info' as const,
        })),
    );
  } catch (err) {
    console.error('[hr-feedback] notify HR failed', err);
  }

  revalidatePath('/hr-feedback');
  revalidatePath('/hr-feedback/inbox');
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(HR_FEEDBACK_STATUSES),
  response: z.string().trim().max(RESPONSE_MAX, `Keep the reply under ${RESPONSE_MAX} characters`),
});

/** HR changes the status and (for named feedback) replies to the sender. */
export async function updateHrFeedbackAction(input: z.input<typeof updateSchema>): Promise<Result> {
  const user = await requireUser();
  if (!canManageHrFeedback(user)) return { ok: false, error: 'Only HR can update feedback' };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your reply' };

  const current = await getHrFeedback(parsed.data.id);
  if (!current) return { ok: false, error: 'This feedback no longer exists' };

  // Anonymous senders can't be reached, so their feedback never stores a reply.
  const response = current.anonymous ? null : parsed.data.response || null;
  const responseChanged = response !== current.response;
  await updateHrFeedback(current.id, {
    status: parsed.data.status,
    response,
    responseChanged,
    actorName: user.displayName ?? user.email,
  });

  if (current.uid) {
    const resolvedNow = parsed.data.status === 'resolved' && current.status !== 'resolved';
    const title = responseChanged && response
      ? 'HR replied to your feedback'
      : resolvedNow
      ? 'HR marked your feedback as resolved'
      : null;
    if (title) {
      try {
        await writeNotificationsForReviewers([
          { uid: current.uid, title, href: '/hr-feedback', tone: resolvedNow ? 'success' : 'info' },
        ]);
      } catch (err) {
        console.error('[hr-feedback] notify sender failed', err);
      }
    }
  }

  revalidatePath('/hr-feedback');
  revalidatePath('/hr-feedback/inbox');
  return { ok: true };
}

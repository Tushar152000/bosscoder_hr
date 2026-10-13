'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { addFeedback } from '@/lib/firestore/feedback';
import { postFeedbackToSlack } from '@/lib/slack';

const schema = z.object({
  message: z.string().trim().min(3, 'Please write a little more').max(2000, 'Keep it under 2000 characters'),
  page: z.string().max(200),
});

/** Anyone signed in can send feedback; it's read in the private /feedback inbox. */
export async function submitFeedbackAction(input: {
  message: string;
  page: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid feedback' };

  const entry = {
    uid: user.uid,
    email: user.email,
    name: user.displayName ?? user.email,
    message: parsed.data.message,
    page: parsed.data.page,
  };
  await addFeedback(entry);
  // Best effort: Slack problems are logged, never surfaced — the feedback is already saved.
  await postFeedbackToSlack(entry);
  return { ok: true };
}

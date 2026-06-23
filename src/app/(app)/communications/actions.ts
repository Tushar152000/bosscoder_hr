'use server';

import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { sendBroadcastEmails } from '@/lib/email/broadcast';
import { sendFeatureLaunchEmails } from '@/lib/email/feature-launch';

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

export interface BroadcastResult {
  attempted: number;
  sent: number;
  failed: number;
  failures: string[];
}

export async function sendBroadcastAction(input: {
  recipients: { email: string; displayName: string }[];
  subject: string;
  message: string;
}): Promise<ActionResult<BroadcastResult>> {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) return { ok: false, error: 'Not authorised.' };
  if (!input.subject.trim()) return { ok: false, error: 'Subject is required.' };
  if (!input.message.trim()) return { ok: false, error: 'Message body is required.' };
  if (input.recipients.length === 0) return { ok: false, error: 'Select at least one department.' };

  const result = await sendBroadcastEmails({
    recipients: input.recipients,
    subject: input.subject.trim(),
    message: input.message.trim(),
    senderName: user.displayName ?? 'HR Team',
  });

  return { ok: true, data: result };
}

export async function sendFeatureLaunchAction(input: {
  recipients: { email: string; displayName: string }[];
  featureName: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
}): Promise<ActionResult<BroadcastResult>> {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) return { ok: false, error: 'Not authorised.' };
  if (!input.featureName.trim()) return { ok: false, error: 'Feature name is required.' };
  if (!input.message.trim()) return { ok: false, error: "Add a short 'what's new' description." };
  if (!input.ctaLabel.trim()) return { ok: false, error: 'Button label is required.' };
  if (!input.ctaUrl.trim()) return { ok: false, error: 'Button link is required.' };
  if (input.recipients.length === 0) return { ok: false, error: 'Select at least one department.' };

  const result = await sendFeatureLaunchEmails({
    recipients: input.recipients,
    featureName: input.featureName.trim(),
    subject: `🎉 ${input.featureName.trim()} is now live`,
    message: input.message.trim(),
    ctaLabel: input.ctaLabel.trim(),
    ctaUrl: input.ctaUrl.trim(),
    senderName: user.displayName ?? 'HR Team',
  });

  return { ok: true, data: result };
}

import 'server-only';
import { sendMail } from '@/lib/email/mailer';

export interface CycleOpenRecipient {
  email: string;
  name: string;
  /** Self-eval form (any reviewer's own self-eval). */
  hasSelfEval: boolean;
  /** Names of subordinates this reviewer must evaluate (manager-evals). */
  managerEvalSubjects: string[];
}

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(full: string | null | undefined, fallback: string): string {
  if (!full) return fallback;
  const trimmed = full.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

interface CycleOpenEmailArgs {
  cycleId: string;
  cycleName: string;
  cadence: 'monthly' | 'quarterly';
  recipient: CycleOpenRecipient;
}

function buildEmail(args: CycleOpenEmailArgs): { subject: string; text: string; html: string } {
  const { cycleId, cycleName, cadence, recipient } = args;
  const link = `${appBaseUrl()}/performance/cycles/${cycleId}`;
  const greetingName = firstName(recipient.name, 'there');

  const formsLines: string[] = [];
  if (recipient.hasSelfEval) formsLines.push('Fill your self-evaluation');
  for (const subj of recipient.managerEvalSubjects) {
    formsLines.push(`Evaluate ${subj}`);
  }

  const subject = `[Bosscoder Workspace] ${cycleName} performance cycle is open — your forms are ready`;

  const text =
    `Hi ${greetingName},\n\n` +
    `The ${cycleName} performance cycle (${cadence}) is now open in Bosscoder Workspace.\n\n` +
    `Your forms in this cycle:\n` +
    formsLines.map((l) => `  • ${l}`).join('\n') +
    `\n\nOpen the cycle: ${link}\n\n` +
    `Reminder: once you submit a form, it cannot be edited. Save drafts as you go.\n\n` +
    `— Bosscoder Workspace\n` +
    `(This is an automated message. Don't reply.)\n`;

  const formsHtml = formsLines
    .map((l) => `<li style="margin: 4px 0;">${escapeHtml(l)}</li>`)
    .join('');

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#1f43ed;color:#ffffff;padding:18px 22px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
      Bosscoder Workspace · Performance
    </div>
    <div style="padding:22px;">
      <h1 style="margin:0 0 6px;font-size:18px;">Hi ${escapeHtml(greetingName)},</h1>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
        The <strong>${escapeHtml(cycleName)}</strong> performance cycle
        (${escapeHtml(cadence)}) is now open. You have ${formsLines.length}
        ${formsLines.length === 1 ? 'form' : 'forms'} assigned to you.
      </p>
      <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;color:#111827;">
        ${formsHtml}
      </ul>
      <p style="margin:0 0 18px;">
        <a href="${link}"
           style="display:inline-block;background:#1f43ed;color:#ffffff;text-decoration:none;
                  padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">
          Open ${escapeHtml(cycleName)} →
        </a>
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.5;">
        Reminder: once you submit a form, it cannot be edited. Save drafts as you go.
      </p>
    </div>
    <div style="padding:14px 22px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      Automated message from Bosscoder Workspace. Please don't reply.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

export interface CycleOpenSendResult {
  attempted: number;
  sent: number;
  failed: number;
  failures: { email: string; error: string }[];
}

export async function sendCycleOpenEmails(args: {
  cycleId: string;
  cycleName: string;
  cadence: 'monthly' | 'quarterly';
  recipients: CycleOpenRecipient[];
}): Promise<CycleOpenSendResult> {
  const { cycleId, cycleName, cadence, recipients } = args;
  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      const { subject, text, html } = buildEmail({ cycleId, cycleName, cadence, recipient: r });
      const res = await sendMail({ to: r.email, subject, text, html });
      if (!res.ok) throw new Error(res.error || 'Unknown send error');
      return r.email;
    })
  );

  const failures: { email: string; error: string }[] = [];
  let sent = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      sent++;
    } else {
      failures.push({
        email: recipients[i].email,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });

  return {
    attempted: recipients.length,
    sent,
    failed: failures.length,
    failures,
  };
}

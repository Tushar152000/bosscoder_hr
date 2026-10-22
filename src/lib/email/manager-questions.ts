import 'server-only';
import { sendMail } from '@/lib/email/mailer';
import { MANAGER_QUESTIONS } from '@/types/review';

/**
 * "Your reviews now have two questions" email to a manager — sent from the cycle
 * page when the questions were added after some reviews were already submitted.
 */

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface ManagerQuestionsRecipient {
  email: string;
  name: string;
  /** Submitted reviews still missing the answers. */
  toAnswer: { subjectName: string; submissionId: string }[];
  /** Reviews not submitted yet — the questions are part of the form now. */
  pendingCount: number;
}

function buildEmail(cycleName: string, r: ManagerQuestionsRecipient): { subject: string; text: string; html: string } {
  const first = r.name.trim().split(/\s+/)[0] || 'there';
  const base = appBaseUrl();
  const questions = [MANAGER_QUESTIONS.contributions, MANAGER_QUESTIONS.improvements];
  const subject = r.toAnswer.length
    ? `[Bosscoder Workspace] Please answer 2 questions in your ${cycleName} reviews`
    : `[Bosscoder Workspace] Your ${cycleName} reviews now include 2 questions`;

  const intro = r.toAnswer.length
    ? `Manager evaluations now include two short written questions. You've already submitted ${r.toAnswer.length === 1 ? 'a review' : `${r.toAnswer.length} reviews`} — your ratings stay as they are; please just add the answers.`
    : `Manager evaluations now include two short written questions. You'll see them in each review you still have to fill.`;

  const text =
    `Hi ${first},\n\n${intro}\n\n` +
    questions.map((q, i) => `${i + 1}. ${q}`).join('\n') +
    (r.toAnswer.length
      ? `\n\nAdd answers for:\n${r.toAnswer.map((t) => `  • ${t.subjectName}: ${base}/performance/submissions/${t.submissionId}`).join('\n')}`
      : `\n\nOpen your reviews: ${base}/performance`) +
    `\n\n— Bosscoder Workspace\n(This is an automated message. Don't reply.)\n`;

  const list = r.toAnswer
    .map(
      (t) =>
        `<li style="margin:6px 0;"><a href="${base}/performance/submissions/${t.submissionId}" style="color:#1f43ed;font-weight:600;text-decoration:none;">${escapeHtml(t.subjectName)} →</a></li>`,
    )
    .join('');

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#1f43ed;color:#ffffff;padding:18px 22px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
      Bosscoder Workspace · Performance
    </div>
    <div style="padding:22px;">
      <h1 style="margin:0 0 6px;font-size:18px;">Hi ${escapeHtml(first)},</h1>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">${escapeHtml(intro)}</p>
      <ol style="margin:0 0 18px;padding-left:20px;font-size:14px;line-height:1.5;color:#111827;">
        ${questions.map((q) => `<li style="margin:4px 0;">${escapeHtml(q)}</li>`).join('')}
      </ol>
      ${
        r.toAnswer.length
          ? `<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151;">Add answers for:</p><ul style="margin:0 0 18px;padding-left:20px;font-size:14px;">${list}</ul>`
          : `<p style="margin:0 0 18px;"><a href="${base}/performance" style="display:inline-block;background:#1f43ed;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">Open your reviews →</a></p>`
      }
    </div>
    <div style="padding:14px 22px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      Automated message from Bosscoder Workspace. Please don't reply.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendManagerQuestionsEmails(
  cycleName: string,
  recipients: ManagerQuestionsRecipient[],
): Promise<{ attempted: number; sent: number; failed: number }> {
  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      const { subject, text, html } = buildEmail(cycleName, r);
      const res = await sendMail({ to: r.email, subject, text, html });
      if (!res.ok) throw new Error(res.error || 'Send failed');
    }),
  );
  const sent = results.filter((x) => x.status === 'fulfilled').length;
  return { attempted: recipients.length, sent, failed: recipients.length - sent };
}

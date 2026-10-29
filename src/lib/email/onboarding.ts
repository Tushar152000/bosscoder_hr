import 'server-only';
import { sendMail } from '@/lib/email/mailer';
import { appBaseUrl } from '@/lib/app-url';

/** Emails around a new joiner's onboarding form. */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';
const longDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

const NAVY = '#0C2D5E';
const INK = '#111827';
const BODY = '#1F2937';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Letter-style layout: wordmark, white card, signature, confidentiality footer. */
function layout(args: { preheader: string; content: string; footer: string }): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:${FONT};color:${INK};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
        <tr><td style="height:4px;background:${NAVY};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:26px 36px 18px;border-bottom:1px solid #E5E7EB;">
          <div style="font-size:18px;font-weight:800;letter-spacing:0.14em;color:${NAVY};">BOSSCODER</div>
          <div style="font-size:11px;font-weight:600;letter-spacing:0.22em;color:#4B5563;margin-top:2px;">ACADEMY &middot; HUMAN RESOURCES</div>
        </td></tr>
        <tr><td style="padding:30px 36px 8px;font-size:15px;line-height:1.65;color:${BODY};">
          ${args.content}
        </td></tr>
        <tr><td style="padding:8px 36px 30px;font-size:15px;line-height:1.6;color:${BODY};">
          <p style="margin:24px 0 0;">Warm regards,</p>
          <p style="margin:4px 0 0;font-weight:700;color:${INK};">Human Resources</p>
          <p style="margin:0;color:${BODY};">Bosscoder Academy</p>
        </td></tr>
        <tr><td style="padding:18px 36px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.6;color:#4B5563;">
          ${args.footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const para = (html: string) => `<p style="margin:0 0 16px;">${html}</p>`;

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr>
    <td style="border-radius:6px;background:${NAVY};">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

function fallbackLink(href: string): string {
  return `<p style="margin:0 0 8px;font-size:13px;color:#4B5563;">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${href}" style="color:${NAVY};word-break:break-all;">${escapeHtml(href)}</a></p>`;
}

const CHECKLIST: [string, string][] = [
  ['Personal details', 'Personal mobile number, personal email address and date of birth'],
  ['Family & emergency contact', "Parents' names and mobile numbers, and an emergency contact"],
  ['Address', 'Current and permanent residential address'],
  ['Identity documents', 'PAN, Aadhaar and UAN numbers, with clear photos or scans of your PAN and Aadhaar cards'],
  ['Previous employment', 'Previous company and reporting manager details (if applicable)'],
];

function checklistTable(): string {
  const rows = CHECKLIST.map(
    ([k, v], i) => `<tr>
      <td style="padding:10px 14px;${i ? 'border-top:1px solid #E5E7EB;' : ''}font-size:14px;font-weight:600;color:${INK};vertical-align:top;width:38%;">${escapeHtml(k)}</td>
      <td style="padding:10px 14px;${i ? 'border-top:1px solid #E5E7EB;' : ''}font-size:14px;color:${BODY};vertical-align:top;">${escapeHtml(v)}</td>
    </tr>`,
  ).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;border:1px solid #E5E7EB;border-radius:8px;border-collapse:separate;">${rows}</table>`;
}

const CONFIDENTIAL =
  'This email contains a personal link meant only for you. Please do not forward it. ' +
  'The information you submit is encrypted and accessible only to the Bosscoder HR team.';

/** The joiner's invite with their personal link. */
export async function sendOnboardingInvite(args: {
  to: string;
  name: string;
  link: string;
  expiresAt: Date;
  designation?: string | null;
  department?: string | null;
  joiningDate?: Date | null;
}) {
  const first = firstName(args.name);
  const until = longDate(args.expiresAt);
  const role = args.designation?.trim();
  const team = args.department?.trim();
  const starts = args.joiningDate && args.joiningDate.getTime() > Date.now() - 86_400_000 ? longDate(args.joiningDate) : null;

  const roleLine =
    `We are delighted to welcome you to Bosscoder Academy` +
    (role ? ` as <strong>${escapeHtml(role)}</strong>` : '') +
    (team ? ` in the <strong>${escapeHtml(team)}</strong> team` : '') +
    (starts ? `, starting <strong>${escapeHtml(starts)}</strong>` : '') +
    '.';
  const roleText =
    `We are delighted to welcome you to Bosscoder Academy` +
    (role ? ` as ${role}` : '') +
    (team ? ` in the ${team} team` : '') +
    (starts ? `, starting ${starts}` : '') +
    '.';

  const subject = 'Welcome to Bosscoder Academy – Please Complete Your Onboarding Form';
  const text =
    `Dear ${first},\n\n${roleText}\n\n` +
    `To complete your joining formalities, please fill in the Employee Onboarding & Documentation Form using your personal link:\n${args.link}\n\n` +
    `Please keep the following ready (the form takes about 10 minutes):\n` +
    CHECKLIST.map(([k, v]) => `  • ${k}: ${v}`).join('\n') +
    `\n\nPlease complete the form by ${until}. Your progress is saved after each step, so you can return to the same link to finish it.\n\n` +
    `If you have any questions, simply reply to this email.\n\n` +
    `Warm regards,\nHuman Resources\nBosscoder Academy\n\n${CONFIDENTIAL}\n`;

  const html = layout({
    preheader: `Please complete your onboarding form by ${until}.`,
    content:
      para(`Dear ${escapeHtml(first)},`) +
      para(roleLine) +
      para('To complete your joining formalities, please fill in the <strong>Employee Onboarding &amp; Documentation Form</strong> using your personal link below.') +
      button(args.link, 'Complete Onboarding Form') +
      `<p style="margin:0 0 10px;font-size:15px;font-weight:700;color:${INK};">Please keep the following ready</p>` +
      `<p style="margin:0 0 10px;font-size:14px;color:${BODY};">The form takes about 10 minutes.</p>` +
      checklistTable() +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#F8FAFC;border-left:3px solid ${NAVY};">
        <tr><td style="padding:12px 16px;font-size:14px;line-height:1.6;color:${BODY};">
          <strong style="color:${INK};">Please complete the form by ${escapeHtml(until)}.</strong><br>
          Your progress is saved after each step, so you can return to the same link to finish it.
        </td></tr></table>` +
      para('If you have any questions, simply reply to this email.') +
      fallbackLink(args.link),
    footer: CONFIDENTIAL,
  });
  return sendMail({ to: args.to, subject, text, html, fromName: 'Bosscoder Academy HR' });
}

/** HR sent the form back with a note. */
export async function sendOnboardingChangesRequested(args: { to: string; name: string; link: string; note: string }) {
  const first = firstName(args.name);
  const subject = 'Action Required: Update to Your Onboarding Form';
  const text =
    `Dear ${first},\n\nThank you for submitting your onboarding form. On review, we need you to update the following:\n\n` +
    `"${args.note}"\n\nPlease make the change using your personal link:\n${args.link}\n\n` +
    `If you have any questions, simply reply to this email.\n\nWarm regards,\nHuman Resources\nBosscoder Academy\n`;
  const html = layout({
    preheader: 'HR has requested an update to your onboarding form.',
    content:
      para(`Dear ${escapeHtml(first)},`) +
      para('Thank you for submitting your onboarding form. On review, we need you to update the following:') +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#FFFBEB;border-left:3px solid #B45309;">
        <tr><td style="padding:12px 16px;font-size:14px;line-height:1.6;color:#451A03;white-space:pre-line;">${escapeHtml(args.note)}</td></tr></table>` +
      para('Please make the change using your personal link below. Everything else you entered has been kept.') +
      button(args.link, 'Update Onboarding Form') +
      para('If you have any questions, simply reply to this email.') +
      fallbackLink(args.link),
    footer: CONFIDENTIAL,
  });
  return sendMail({ to: args.to, subject, text, html, fromName: 'Bosscoder Academy HR' });
}

/** Tell HR a joiner submitted. */
export async function sendOnboardingSubmittedToHr(args: { to: string[]; name: string; employeeId: string }) {
  if (!args.to.length) return;
  const href = `${appBaseUrl()}/directory/${args.employeeId}`;
  const subject = `Onboarding form submitted: ${args.name}`;
  const text =
    `${args.name} has submitted their onboarding form.\n\n` +
    `Please review their details and ID documents, then verify the submission or request changes:\n${href}\n`;
  const html = layout({
    preheader: `${args.name} has submitted their onboarding form.`,
    content:
      para('Hello,') +
      para(`<strong>${escapeHtml(args.name)}</strong> has submitted their onboarding form.`) +
      para('Please review their details and ID documents, then verify the submission or request changes.') +
      button(href, 'Review Submission'),
    footer: 'Sent automatically by Bosscoder Workspace.',
  });
  await Promise.allSettled(args.to.map((to) => sendMail({ to, subject, text, html, fromName: 'Bosscoder Workspace' })));
}

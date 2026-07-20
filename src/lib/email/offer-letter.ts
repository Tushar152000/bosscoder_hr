import 'server-only';
import { sendMail } from '@/lib/email/mailer';
import { formatDateLong } from '@/lib/offers/render';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(full: string): string {
  const trimmed = full.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : 'there';
}

export type LetterKind = 'offer' | 'relieving' | 'experience';

export interface SendOfferLetterEmailArgs {
  candidateName: string;
  candidateEmail: string;
  designation: string;
  joiningDate: string;
  pocName: string;
  pocDesignation: string;
  pocEmail: string;
  pdf: Buffer;
  pdfFilename: string;
  /** Which letter this is — changes the fixed subject + body. */
  letterKind?: LetterKind;
}

const SUBJECTS: Record<LetterKind, string> = {
  offer: 'Your Offer Letter from Bosscoder Academy',
  relieving: 'Your Relieving Letter from Bosscoder Academy',
  experience: 'Your Experience Letter from Bosscoder Academy',
};

// Fixed office/policy details that go into every offer email. Update here if
// the office address, working days/hours, or laptop policy ever changes.
const OFFICE_ADDRESS = '2nd Floor, A-150, Sector 63, Noida, UP (near ICICI Bank ATM)';
const OFFICE_MAPS_URL = 'https://maps.app.goo.gl/3W6iucHZimg98HSNA';
const WORKING_DAYS_LINE1 = 'Monday to Friday (WFO)';
const WORKING_DAYS_LINE2 = 'Saturday (WFH)';
const WORKING_HOURS = '10:30 AM to 6:30 PM';
const COMPANY_LINKEDIN_URL = 'https://www.linkedin.com/school/bosscoderacademy/';
const COMPANY_WEBSITE_URL = 'https://www.bosscoderacademy.com/';

interface BodyParts {
  text: string;
  html: string;
}

function buildBody(args: {
  greetingName: string;
  designation: string;
  joiningDate: string;
  pocName: string;
  pocDesignation: string;
  pocEmail: string;
  letterKind: LetterKind;
}): BodyParts {
  const { greetingName, designation, joiningDate, pocName, pocDesignation, pocEmail, letterKind } = args;
  const hasPoc = !!pocEmail;
  const signOff = hasPoc
    ? `${pocName}\n${pocDesignation}\nLinkedin | Website`
    : 'Bosscoder Academy';
  const signOffHtml = hasPoc
    ? `${escapeHtml(pocName)}<br/>${escapeHtml(pocDesignation)}<br/>` +
      `<a href="${COMPANY_LINKEDIN_URL}" style="color:#0C447C;">Linkedin</a> | ` +
      `<a href="${COMPANY_WEBSITE_URL}" style="color:#0C447C;">Website</a>`
    : 'Bosscoder Academy';

  if (letterKind === 'offer') {
    const start = joiningDate ? formatDateLong(joiningDate) : '';
    const text =
      `Hi ${greetingName},\n\n` +
      `I hope this email finds you well.\n\n` +
      `It is with great pleasure that we formally offer you the position of ${designation} at Bosscoder Software Services Private Limited (Bosscoder Academy). After reviewing your qualifications and experience, we are confident that your expertise will be a valuable addition to our team.\n\n` +
      `We believe that your skills and background align perfectly with what we're looking for, and we're excited about the opportunity to work together.\n\n` +
      `Employment Details:\n` +
      `- Start Date: ${start}\n` +
      `- Location: ${OFFICE_ADDRESS} ${OFFICE_MAPS_URL}\n` +
      `- Working Days: ${WORKING_DAYS_LINE1}, ${WORKING_DAYS_LINE2}\n` +
      `- Working Hours: ${WORKING_HOURS}\n\n` +
      `Please note you will be required to use your personal laptop for work-related tasks.\n\n` +
      `Kindly review the attached offer letter carefully, which includes details about the position, compensation, company policies, and other relevant employment terms. If everything is in order, kindly sign and return it to us at the earliest.\n\n` +
      (hasPoc ? `If you have any questions or need assistance, feel free to contact me at ${pocEmail}.\n\n` : '') +
      `We look forward to your response and to welcoming you to Bosscoder Academy.\n\n` +
      `Thank you,\n\n` +
      `Best Regards,\n${signOff}\n`;

    const html = `
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">I hope this email finds you well.</p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
        It is with great pleasure that we formally offer you the position of
        <strong>${escapeHtml(designation)}</strong> at Bosscoder Software Services Private Limited
        (Bosscoder Academy). After reviewing your qualifications and experience, we are confident that
        your expertise will be a valuable addition to our team.
      </p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
        We believe that your skills and background align perfectly with what we're looking for, and
        we're excited about the opportunity to work together.
      </p>
      <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">Employment Details:</p>
      <ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:1.7;color:#374151;">
        <li><strong>Start Date:</strong> ${escapeHtml(start)}</li>
        <li>
          <strong>Location:</strong> ${escapeHtml(OFFICE_ADDRESS)}
          <a href="${OFFICE_MAPS_URL}" style="color:#0C447C;">${OFFICE_MAPS_URL}</a>
        </li>
        <li><strong>Working Days:</strong> ${escapeHtml(WORKING_DAYS_LINE1)}<br/>${escapeHtml(WORKING_DAYS_LINE2)}</li>
        <li><strong>Working Hours:</strong> ${escapeHtml(WORKING_HOURS)}</li>
      </ul>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
        Please note you will be required to use your personal laptop for work-related tasks.
      </p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
        Kindly review the attached offer letter carefully, which includes details about the position,
        compensation, company policies, and other relevant employment terms. If everything is in order,
        kindly sign and return it to us at the earliest.
      </p>
      ${
        hasPoc
          ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
        If you have any questions or need assistance, feel free to contact me at
        <a href="mailto:${encodeURIComponent(pocEmail)}" style="color:#0C447C;">${escapeHtml(pocEmail)}</a>.
      </p>`
          : ''
      }
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
        We look forward to your response and to welcoming you to Bosscoder Academy.
      </p>
      <p style="margin:0 0 4px;font-size:14px;line-height:1.55;color:#374151;">Thank you,</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">Best Regards,<br/>${signOffHtml}</p>`;

    return { text, html };
  }

  const intro =
    letterKind === 'relieving'
      ? 'Please find attached your relieving letter from Bosscoder Academy.'
      : 'Please find attached your experience letter from Bosscoder Academy.';

  const text =
    `Hi ${greetingName},\n\n` +
    `${intro}\n\n` +
    (hasPoc ? `If you have any questions, feel free to reach out to ${pocName} at ${pocEmail}.\n\n` : '') +
    `Wishing you all the best!\n\n` +
    `Regards,\n${signOff}\n`;

  const html = `
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">${escapeHtml(intro)}</p>
    ${
      hasPoc
        ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">
      If you have any questions, feel free to reach out to
      <strong>${escapeHtml(pocName)}</strong> at
      <a href="mailto:${encodeURIComponent(pocEmail)}" style="color:#0C447C;">${escapeHtml(pocEmail)}</a>.
    </p>`
        : ''
    }
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#374151;">Wishing you all the best!</p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#374151;">Regards,<br/>${signOffHtml}</p>`;

  return { text, html };
}

export async function sendOfferLetterEmail(
  args: SendOfferLetterEmailArgs
): Promise<{ ok: boolean; error?: string }> {
  const {
    candidateName,
    candidateEmail,
    designation,
    joiningDate,
    pocName,
    pocDesignation,
    pocEmail,
    pdf,
    pdfFilename,
    letterKind = 'offer',
  } = args;
  const greetingName = firstName(candidateName);
  const subject = SUBJECTS[letterKind];
  const { text, html: bodyHtml } = buildBody({
    greetingName,
    designation,
    joiningDate,
    pocName,
    pocDesignation,
    pocEmail,
    letterKind,
  });

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#0C447C;color:#ffffff;padding:18px 22px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
      Bosscoder Academy
    </div>
    <div style="padding:22px;">
      <h1 style="margin:0 0 6px;font-size:18px;">Hi ${escapeHtml(greetingName)},</h1>
      ${bodyHtml}
    </div>
    <div style="padding:14px 22px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      Bosscoder Academy
    </div>
  </div>
</body>
</html>`;

  return sendMail({
    to: candidateEmail,
    subject,
    text,
    html,
    replyTo: pocEmail || undefined,
    fromName: pocName || undefined,
    attachments: [
      {
        filename: `${pdfFilename}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });
}

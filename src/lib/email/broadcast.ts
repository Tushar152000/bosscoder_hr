import 'server-only';
import { sendMail } from './mailer';

export interface BroadcastRecipient {
  email: string;
  displayName: string;
}

function buildEmail(args: {
  recipientName: string;
  subject: string;
  message: string;
  senderName: string;
}): { html: string; text: string } {
  const { recipientName, subject, message, senderName } = args;
  const firstName = recipientName.split(' ')[0];
  const bodyHtml = message
    .split('\n')
    .map((line) =>
      line.trim()
        ? `<p style="margin:0 0 14px 0;color:#374151;font-size:15px;line-height:1.65;">${line}</p>`
        : `<p style="margin:0 0 6px 0;">&nbsp;</p>`,
    )
    .join('');

  const portalUrl = 'https://hr.bosscoderacademy.com/';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:800px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0C447C;border-radius:14px 14px 0 0;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">
                    Bosscoder Academy
                  </h1>
                  <p style="margin:4px 0 0;color:#93C5FD;font-size:12px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;">
                    Team Communication
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Subject banner -->
        <tr>
          <td style="background:#1A5C9E;padding:14px 36px;">
            <p style="margin:0;color:#E0F0FF;font-size:16px;font-weight:600;">${subject}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px;">
            <p style="margin:0 0 22px 0;color:#111827;font-size:16px;font-weight:600;">Hi ${firstName},</p>
            <div>${bodyHtml}</div>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;margin-bottom:8px;">
              <tr>
                <td align="center">
                  <a href="${portalUrl}" target="_blank"
                    style="display:inline-block;background:#0C447C;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:8px;letter-spacing:0.1px;">
                    Open HR Portal →
                  </a>
                  <p style="margin:10px 0 0;color:#9CA3AF;font-size:11px;">
                    or visit: <a href="${portalUrl}" style="color:#0C447C;text-decoration:none;">${portalUrl}</a>
                  </p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td style="border-top:1px solid #E5E7EB;padding-top:20px;">
                  <p style="margin:0;color:#6B7280;font-size:13px;">
                    Best regards,<br>
                    <strong style="color:#374151;">${senderName}</strong> · Bosscoder HR Team
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;border-radius:0 0 14px 14px;padding:16px 36px;border:1px solid #E2E8F0;border-top:none;">
            <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">
              This message was sent via Bosscoder Workspace ·
              <a href="${portalUrl}" style="color:#0C447C;text-decoration:none;">hr.bosscoderacademy.com</a>
              · Do not reply to this email
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${firstName},\n\n${message}\n\nOpen the HR Portal: ${portalUrl}\n\nBest regards,\n${senderName} · Bosscoder HR Team`;
  return { html, text };
}

export async function sendBroadcastEmails(args: {
  recipients: BroadcastRecipient[];
  subject: string;
  message: string;
  senderName: string;
}): Promise<{ attempted: number; sent: number; failed: number; failures: string[] }> {
  const { recipients, subject, message, senderName } = args;

  const results = await Promise.allSettled(
    recipients.map((r) => {
      const { html, text } = buildEmail({
        recipientName: r.displayName,
        subject,
        message,
        senderName,
      });
      return sendMail({ to: r.email, subject, html, text });
    }),
  );

  let sent = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.ok) {
      sent++;
    } else {
      failed++;
      const err =
        r.status === 'rejected' ? String(r.reason) : (r.value.error ?? 'Unknown error');
      failures.push(`${recipients[i].email}: ${err}`);
    }
  }

  return { attempted: recipients.length, sent, failed, failures };
}

import 'server-only';
import { sendMail } from './mailer';
import type { BroadcastRecipient } from './broadcast';

const PORTAL_URL = 'https://hr.bosscoderacademy.com';

/** Resolve a CTA target: absolute URLs pass through; anything else is treated
 *  as a path on the HR portal. */
function resolveCtaUrl(raw: string): string {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `${PORTAL_URL}/${v.replace(/^\/+/, '')}`;
}

function buildFeatureLaunchEmail(args: {
  recipientName: string;
  featureName: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  senderName: string;
}): { html: string; text: string } {
  const { recipientName, featureName, message, ctaLabel, ctaUrl, senderName } = args;
  const firstName = recipientName.split(' ')[0];
  const href = resolveCtaUrl(ctaUrl);

  const bodyHtml = message
    .split('\n')
    .map((line) =>
      line.trim()
        ? `<p style="margin:0 0 14px 0;color:#374151;font-size:15px;line-height:1.65;">${line}</p>`
        : `<p style="margin:0 0 6px 0;">&nbsp;</p>`,
    )
    .join('');

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
            <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">Bosscoder Academy</h1>
            <p style="margin:4px 0 0;color:#93C5FD;font-size:12px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;">Product Update</p>
          </td>
        </tr>

        <!-- Now-live banner -->
        <tr>
          <td style="background:linear-gradient(90deg,#0F6E56,#1D9E75);padding:20px 36px;">
            <p style="margin:0;color:#D1FAE5;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">🎉 Now Live</p>
            <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;">${featureName}</p>
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
                  <a href="${href}" target="_blank"
                    style="display:inline-block;background:#0F6E56;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.1px;">
                    ${ctaLabel} →
                  </a>
                  <p style="margin:10px 0 0;color:#9CA3AF;font-size:11px;">
                    or visit: <a href="${href}" style="color:#0C447C;text-decoration:none;">${href}</a>
                  </p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td style="border-top:1px solid #E5E7EB;padding-top:20px;">
                  <p style="margin:0;color:#6B7280;font-size:13px;">
                    Cheers,<br>
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
              <a href="${PORTAL_URL}" style="color:#0C447C;text-decoration:none;">hr.bosscoderacademy.com</a>
              · Do not reply to this email
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${firstName},\n\n🎉 ${featureName} is now live!\n\n${message}\n\n${ctaLabel}: ${href}\n\nCheers,\n${senderName} · Bosscoder HR Team`;
  return { html, text };
}

export async function sendFeatureLaunchEmails(args: {
  recipients: BroadcastRecipient[];
  featureName: string;
  subject: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  senderName: string;
}): Promise<{ attempted: number; sent: number; failed: number; failures: string[] }> {
  const { recipients, featureName, subject, message, ctaLabel, ctaUrl, senderName } = args;

  const results = await Promise.allSettled(
    recipients.map((r) => {
      const { html, text } = buildFeatureLaunchEmail({
        recipientName: r.displayName,
        featureName,
        message,
        ctaLabel,
        ctaUrl,
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
    if (r.status === 'fulfilled' && r.value.ok) sent++;
    else {
      failed++;
      const err = r.status === 'rejected' ? String(r.reason) : (r.value.error ?? 'Unknown error');
      failures.push(`${recipients[i].email}: ${err}`);
    }
  }
  return { attempted: recipients.length, sent, failed, failures };
}

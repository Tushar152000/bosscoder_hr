import 'server-only';
import { sendMail } from './mailer';

const PORTAL_URL = 'https://hr.bosscoderacademy.com';

function buildLeaveRequestEmail(args: {
  managerName: string;
  employeeName: string;
  leaveTypeLabel: string;
  fromDate: string;
  toDate: string;
  reason: string;
}): { html: string; text: string } {
  const { managerName, employeeName, leaveTypeLabel, fromDate, toDate, reason } = args;
  const firstName = managerName.split(' ')[0];
  const href = `${PORTAL_URL}/attendance`;
  const range = fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`;

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
            <p style="margin:4px 0 0;color:#93C5FD;font-size:12px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;">Leave Request</p>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#EBF3FE;padding:20px 36px;">
            <p style="margin:0;color:#1D4ED8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Pending your approval</p>
            <p style="margin:6px 0 0;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">${employeeName} requested ${leaveTypeLabel}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px;">
            <p style="margin:0 0 22px 0;color:#111827;font-size:16px;font-weight:600;">Hi ${firstName},</p>
            <p style="margin:0 0 14px 0;color:#374151;font-size:15px;line-height:1.65;">
              <strong>${employeeName}</strong> has applied for leave and it's awaiting your review.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #E5E7EB;border-radius:10px;">
              <tr><td style="padding:14px 18px;border-bottom:1px solid #F1F5F9;">
                <span style="color:#6B7280;font-size:13px;">Leave type</span><br>
                <strong style="color:#111827;font-size:15px;">${leaveTypeLabel}</strong>
              </td></tr>
              <tr><td style="padding:14px 18px;border-bottom:1px solid #F1F5F9;">
                <span style="color:#6B7280;font-size:13px;">Dates</span><br>
                <strong style="color:#111827;font-size:15px;">${range}</strong>
              </td></tr>
              <tr><td style="padding:14px 18px;">
                <span style="color:#6B7280;font-size:13px;">Reason</span><br>
                <strong style="color:#111827;font-size:15px;">${reason}</strong>
              </td></tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;margin-bottom:8px;">
              <tr>
                <td align="center">
                  <a href="${href}" target="_blank"
                    style="display:inline-block;background:#0C447C;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.1px;">
                    Review request →
                  </a>
                  <p style="margin:10px 0 0;color:#9CA3AF;font-size:11px;">
                    or visit: <a href="${href}" style="color:#0C447C;text-decoration:none;">${href}</a>
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

  const text = `Hi ${firstName},\n\n${employeeName} has applied for leave and it's awaiting your review.\n\nLeave type: ${leaveTypeLabel}\nDates: ${range}\nReason: ${reason}\n\nReview request: ${href}`;
  return { html, text };
}

export async function sendLeaveRequestEmail(args: {
  to: string;
  managerName: string;
  employeeName: string;
  leaveTypeLabel: string;
  fromDate: string;
  toDate: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { html, text } = buildLeaveRequestEmail(args);
  const range = args.fromDate === args.toDate ? args.fromDate : `${args.fromDate}–${args.toDate}`;
  return sendMail({
    to: args.to,
    subject: `Leave request from ${args.employeeName} (${range})`,
    html,
    text,
  });
}

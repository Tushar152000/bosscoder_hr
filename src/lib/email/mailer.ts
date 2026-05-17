import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

let cached: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cached) return cached;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    // Email is best-effort — don't crash if creds aren't set; just no-op.
    return null;
  }
  cached = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cached;
}

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    return { ok: false, error: 'Email transport not configured (missing GMAIL_* env vars).' };
  }
  const from = process.env.GMAIL_USER!;
  try {
    await t.sendMail({
      from: `Bosscoder Workspace <${from}>`,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' };
  }
}

/** Strip the SMTP transport (used in tests / for forced re-init). */
export function resetTransporter() {
  cached = null;
}

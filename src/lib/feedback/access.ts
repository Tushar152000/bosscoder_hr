import type { CurrentUser } from '@/lib/auth/session';

/** Who may read the feedback inbox. Override with FEEDBACK_VIEWER_EMAILS (comma-separated). */
function viewerEmails(): string[] {
  const fromEnv = (process.env.FEEDBACK_VIEWER_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : ['tushar.chauhan@bosscoderacademy.com'];
}

export function canViewFeedback(user: Pick<CurrentUser, 'email'>): boolean {
  return viewerEmails().includes(user.email.toLowerCase());
}

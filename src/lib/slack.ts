import 'server-only';

/**
 * Slack notifications for feedback.
 *
 *   SLACK_FEEDBACK_WEBHOOK_URL  Incoming Webhook for the channel to post into (required to post).
 *   SLACK_BOT_TOKEN             Optional bot token with `users:read.email` — lets us @-mention
 *                               the sender by their Slack user ID instead of plain name/email.
 *
 * Both unset ⇒ every call is a silent no-op. Failures are logged, never thrown, so Slack
 * being down can't break the feature that triggered the notification.
 */

const TIMEOUT_MS = 5000;

/** Escape the three characters Slack mrkdwn treats as control characters. */
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Slack user ID for a work email, or null (no token, not found, or Slack error). */
async function slackUserIdForEmail(email: string): Promise<string | null> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) return null;
  try {
    const res = await fetchWithTimeout(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await res.json()) as { ok: boolean; user?: { id: string } };
    return body.ok && body.user ? body.user.id : null;
  } catch {
    return null;
  }
}

export async function postFeedbackToSlack(entry: {
  name: string;
  email: string;
  message: string;
  page: string;
}): Promise<void> {
  const webhook = process.env.SLACK_FEEDBACK_WEBHOOK_URL?.trim();
  if (!webhook) return;

  try {
    const slackId = await slackUserIdForEmail(entry.email);
    const who = slackId ? `<@${slackId}>` : `*${esc(entry.name)}* (${esc(entry.email)})`;
    const inboxUrl = `${(process.env.APP_BASE_URL ?? '').replace(/\/$/, '')}/feedback`;

    const res = await fetchWithTimeout(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New HR portal feedback from ${entry.name}`, // notification preview
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `:speech_balloon: *New feedback* from ${who}` },
          },
          {
            type: 'section',
            // Quote the message; Slack caps a text block at 3000 chars.
            text: { type: 'mrkdwn', text: esc(entry.message).slice(0, 2900).replace(/^/gm, '>') },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Sent from \`${esc(entry.page || '/')}\`` },
              ...(inboxUrl.startsWith('http') ? [{ type: 'mrkdwn', text: `<${inboxUrl}|Open feedback inbox>` }] : []),
            ],
          },
        ],
      }),
    });
    if (!res.ok) console.error('[slack] feedback post failed', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('[slack] feedback post error', err);
  }
}

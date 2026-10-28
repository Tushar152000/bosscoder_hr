import 'server-only';
import { appBaseUrl } from '@/lib/app-url';

/**
 * Slack integration.
 *
 *   SLACK_FEEDBACK_WEBHOOK_URL  Incoming Webhook for the channel feedback is posted into.
 *   SLACK_BOT_TOKEN             Bot token. Feedback uses it (optionally) to @-mention the sender;
 *                               celebration posts need it. Scopes: chat:write, files:write,
 *                               users:read, users:read.email (+ channels:read, groups:read to show channel names).
 *   SLACK_CELEBRATIONS_CHANNEL_ID       Channel ID for birthday / anniversary posts (e.g. #general).
 *   SLACK_CELEBRATIONS_TEST_CHANNEL_ID  Channel ID to try a post first (e.g. #hr-dashboard).
 *
 * Both unset ⇒ every call is a silent no-op. Failures are logged, never thrown, so Slack
 * being down can't break the feature that triggered the notification.
 */

const TIMEOUT_MS = 5000;
const UPLOAD_TIMEOUT_MS = 20000;

/** Escape the three characters Slack mrkdwn treats as control characters. */
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Slack user ID for a work email, or null (no token, not found, or Slack error). */
export async function slackUserIdForEmail(email: string): Promise<string | null> {
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
    const inboxUrl = `${appBaseUrl()}/feedback`;

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

// ── Celebration posts (birthdays / work anniversaries) ─────────────────────────

export type CelebrationTarget = 'test' | 'live';

export interface CelebrationChannel {
  target: CelebrationTarget;
  id: string;
  /** "#general" when the token can read it, otherwise null. */
  name: string | null;
}

function botToken(): string | null {
  return process.env.SLACK_BOT_TOKEN?.trim() || null;
}

function channelIdFor(target: CelebrationTarget): string | null {
  const raw = target === 'live' ? process.env.SLACK_CELEBRATIONS_CHANNEL_ID : process.env.SLACK_CELEBRATIONS_TEST_CHANNEL_ID;
  return raw?.trim() || null;
}

/** Calls a Slack Web API method with form-encoded args; returns the parsed body. */
async function slackApi<T extends object>(
  method: string,
  args: Record<string, string>,
  ms = TIMEOUT_MS,
): Promise<{ ok: boolean; error?: string } & Partial<T>> {
  const token = botToken();
  if (!token) return { ok: false, error: 'not_configured' } as { ok: boolean; error?: string } & Partial<T>;
  const res = await fetchWithTimeout(
    `https://slack.com/api/${method}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(args).toString(),
    },
    ms,
  );
  return (await res.json()) as { ok: boolean; error?: string } & Partial<T>;
}

/** Channels configured for celebration posts, test first. Empty ⇒ not set up. */
export async function celebrationChannels(): Promise<CelebrationChannel[]> {
  if (!botToken()) return [];
  const targets: CelebrationTarget[] = ['test', 'live'];
  const found = targets.flatMap((target) => {
    const id = channelIdFor(target);
    return id ? [{ target, id }] : [];
  });
  return Promise.all(
    found.map(async (c) => {
      try {
        const info = await slackApi<{ channel: { name: string } }>('conversations.info', { channel: c.id }, 3000);
        return { ...c, name: info.ok && info.channel ? `#${info.channel.name}` : null };
      } catch {
        return { ...c, name: null };
      }
    }),
  );
}

const SLACK_ERRORS: Record<string, string> = {
  not_configured: 'Slack is not set up yet (SLACK_BOT_TOKEN is missing).',
  not_in_channel: 'The HR bot is not in that channel yet. In Slack, open the channel and run /invite @<bot name>.',
  channel_not_found: "Slack can't find that channel. Check the channel ID, and invite the bot if it's private.",
  missing_scope: 'The Slack bot is missing a permission (needs chat:write and files:write).',
  invalid_auth: 'The Slack bot token is invalid.',
  not_authed: 'The Slack bot token is invalid.',
  token_revoked: 'The Slack bot token was revoked.',
  ratelimited: 'Slack is rate-limiting us. Try again in a minute.',
};

function explain(error: string | undefined): string {
  return (error && SLACK_ERRORS[error]) || `Slack error: ${error ?? 'unknown'}`;
}

/**
 * Post one message (Slack mrkdwn, mentions already resolved) to a celebration channel,
 * with the images attached to that same message — like a post typed by hand.
 */
export async function postCelebrationToSlack(input: {
  target: CelebrationTarget;
  text: string;
  files: { filename: string; title: string; data: Buffer }[];
}): Promise<{ ok: true; channelId: string } | { ok: false; error: string }> {
  const channel = channelIdFor(input.target);
  if (!botToken()) return { ok: false, error: explain('not_configured') };
  if (!channel) {
    return {
      ok: false,
      error: `No ${input.target === 'live' ? 'company' : 'test'} channel is set (SLACK_CELEBRATIONS_${input.target === 'live' ? '' : 'TEST_'}CHANNEL_ID).`,
    };
  }

  try {
    if (input.files.length === 0) {
      const res = await slackApi('chat.postMessage', { channel, text: input.text, unfurl_links: 'false' });
      return res.ok ? { ok: true, channelId: channel } : { ok: false, error: explain(res.error) };
    }

    // 1) reserve an upload URL per file, 2) send the bytes, 3) share them all in one message.
    const uploaded: { id: string; title: string }[] = [];
    for (const f of input.files) {
      const slot = await slackApi<{ upload_url: string; file_id: string }>('files.getUploadURLExternal', {
        filename: f.filename,
        length: String(f.data.length),
      });
      if (!slot.ok || !slot.upload_url || !slot.file_id) return { ok: false, error: explain(slot.error) };
      const put = await fetchWithTimeout(
        slot.upload_url,
        { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(f.data) },
        UPLOAD_TIMEOUT_MS,
      );
      if (!put.ok) return { ok: false, error: `Slack upload failed (${put.status}).` };
      uploaded.push({ id: slot.file_id, title: f.title });
    }

    const done = await slackApi(
      'files.completeUploadExternal',
      { files: JSON.stringify(uploaded), channel_id: channel, initial_comment: input.text },
      UPLOAD_TIMEOUT_MS,
    );
    return done.ok ? { ok: true, channelId: channel } : { ok: false, error: explain(done.error) };
  } catch (err) {
    console.error('[slack] celebration post error', err);
    return { ok: false, error: "Couldn't reach Slack. Try again." };
  }
}

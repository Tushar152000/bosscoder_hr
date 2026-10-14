'use server';

import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { writeAuditLog } from '@/lib/audit';
import { photoDataUrl, renderCelebrationCard } from '@/lib/celebrations/card';
import { getCelebrationPerson } from '@/lib/celebrations/people';
import { composeMessage, toSlackText, type CelebrationKind } from '@/lib/celebrations/message';
import { postCelebrationToSlack, slackUserIdForEmail, type CelebrationTarget } from '@/lib/slack';
import type { ActionResult } from './actions';

/** A photo the HR person picked, already resized to JPEG in the browser. */
const PHOTO_RE = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_CHARS = 2_500_000;
const MAX_PEOPLE = 10;

interface CardRequest {
  employeeId: string;
  kind: CelebrationKind;
  years: number;
  /** Replaces their profile photo on the card. */
  photo?: string | null;
}

function cleanYears(kind: CelebrationKind, years: number): number {
  return kind === 'anniversary' ? Math.min(60, Math.max(1, Math.round(Number(years) || 1))) : 0;
}

async function cardFor(req: CardRequest, person: { name: string; designation: string; photoURL: string | null }) {
  const custom = req.photo && req.photo.length <= MAX_PHOTO_CHARS && PHOTO_RE.test(req.photo) ? req.photo : null;
  return renderCelebrationCard({
    kind: req.kind,
    name: person.name,
    designation: person.designation,
    years: cleanYears(req.kind, req.years),
    photo: custom ?? (await photoDataUrl(person.photoURL)),
  });
}

/** PNG data URL of one person's card, for the composer preview and download. */
export async function previewCelebrationCardAction(req: CardRequest): Promise<ActionResult<string>> {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) return { ok: false, error: 'Not authorised.' };
  const person = await getCelebrationPerson(req.employeeId);
  if (!person) return { ok: false, error: 'Employee not found.' };
  try {
    const png = await cardFor(req, person);
    return { ok: true, data: `data:image/png;base64,${png.toString('base64')}` };
  } catch (err) {
    console.error('[celebrations] card render failed', err);
    return { ok: false, error: "Couldn't create the card." };
  }
}

export interface SendCelebrationResult {
  /** People Slack had no account for — they appear as plain "@Name" text. */
  notMentioned: string[];
}

export async function sendCelebrationAction(input: {
  target: CelebrationTarget;
  mentionChannel: boolean;
  intro: string;
  celebrants: (CardRequest & { note: string; attachCard: boolean })[];
}): Promise<ActionResult<SendCelebrationResult>> {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) return { ok: false, error: 'Not authorised.' };
  if (input.target !== 'test' && input.target !== 'live') return { ok: false, error: 'Pick a channel.' };
  if (input.celebrants.length === 0) return { ok: false, error: 'Add at least one person.' };
  if (input.celebrants.length > MAX_PEOPLE) return { ok: false, error: `At most ${MAX_PEOPLE} people per post.` };
  if (input.intro.length > 1500 || input.celebrants.some((c) => c.note.length > 3000)) {
    return { ok: false, error: 'The message is too long for Slack.' };
  }

  const people = await Promise.all(input.celebrants.map((c) => getCelebrationPerson(c.employeeId)));
  const missing = input.celebrants.filter((_, i) => !people[i]);
  if (missing.length) return { ok: false, error: 'Someone in this post is no longer an active employee. Remove them and try again.' };
  const rows = input.celebrants.map((c, i) => ({ req: c, person: people[i]! }));

  // Use the stored names, so the @Name placeholders match what we resolve below.
  const message = composeMessage({
    mentionChannel: input.mentionChannel,
    intro: input.intro,
    celebrants: rows.map(({ req, person }) => ({
      employeeId: person.employeeId,
      name: person.name,
      kind: req.kind,
      years: cleanYears(req.kind, req.years),
      note: req.note,
    })),
  });
  if (!message.trim()) return { ok: false, error: 'Write a message first.' };

  const slackIds = new Map<string, string | null>();
  await Promise.all(rows.map(async ({ person }) => slackIds.set(person.name, await slackUserIdForEmail(person.email))));

  let files: { filename: string; title: string; data: Buffer }[];
  try {
    files = await Promise.all(
      rows
        .filter(({ req }) => req.attachCard)
        .map(async ({ req, person }) => ({
          filename: `${person.name.replace(/[^\w]+/g, '-').toLowerCase()}-${req.kind}.png`,
          title: `${person.name} — ${req.kind === 'birthday' ? 'Happy Birthday' : 'Work anniversary'}`,
          data: await cardFor(req, person),
        })),
    );
  } catch (err) {
    console.error('[celebrations] card render failed', err);
    return { ok: false, error: "Couldn't create the cards. Try again, or untick “Attach card”." };
  }

  const res = await postCelebrationToSlack({ target: input.target, text: toSlackText(message, slackIds), files });
  if (!res.ok) return res;

  await writeAuditLog({
    actorUid: user.uid,
    actorEmail: user.email,
    action: 'slack.celebration_post',
    resource: { type: 'slack_channel', id: res.channelId },
    metadata: {
      target: input.target,
      people: rows.map(({ req, person }) => ({ employeeId: person.employeeId, kind: req.kind })),
      cards: files.length,
    },
  }).catch(() => {});

  return { ok: true, data: { notMentioned: rows.filter(({ person }) => !slackIds.get(person.name)).map(({ person }) => person.name) } };
}

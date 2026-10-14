/**
 * Birthday / work-anniversary Slack posts — the same shape HR used to type by hand:
 *
 *   @channel Let's congratulate @A on completing 3 years with Bosscoder Academy! & @B a very Happy Birthday!
 *
 *   @A <note>
 *
 *   @B <note>
 *
 * People are written as `@Full Name` everywhere in the editor; `toSlackText` swaps those
 * for real Slack mentions when the post is sent. Shared by the composer and the server.
 */

export type CelebrationKind = 'birthday' | 'anniversary';

export interface Celebrant {
  employeeId: string;
  name: string;
  kind: CelebrationKind;
  /** Completed years — anniversaries only. */
  years: number;
  /** Paragraph posted after the intro, prefixed with the person's @mention. */
  note: string;
}

export function yearsLabel(years: number): string {
  return `${years} year${years === 1 ? '' : 's'}`;
}

/** "A", "A and B", "A, B and C" */
function joinNames(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function defaultIntro(celebrants: Pick<Celebrant, 'name' | 'kind' | 'years'>[]): string {
  const anniv = celebrants.filter((c) => c.kind === 'anniversary');
  const bday = celebrants.filter((c) => c.kind === 'birthday');

  // Group anniversaries by years so "A and B on completing 2 years" reads naturally.
  const byYears = new Map<number, string[]>();
  for (const c of anniv) byYears.set(c.years, [...(byYears.get(c.years) ?? []), `@${c.name}`]);
  const annivText = joinNames(
    [...byYears.entries()].map(([y, names]) => `${joinNames(names)} on completing ${yearsLabel(y)}`),
  );
  const bdayText = joinNames(bday.map((c) => `@${c.name}`));

  if (anniv.length && bday.length) {
    return `Let's congratulate ${annivText} with Bosscoder Academy! & ${bdayText} a very Happy Birthday!`;
  }
  if (anniv.length) return `Let's congratulate ${annivText} with Bosscoder Academy!`;
  if (bday.length) return `Let's wish ${bdayText} a very Happy Birthday!`;
  return '';
}

export function defaultNote(c: Pick<Celebrant, 'kind' | 'years'>): string {
  if (c.kind === 'anniversary') {
    const span = c.years === 1 ? 'One year' : `${numberWord(c.years)} years`;
    return `${span} of dedication, hard work and consistent contribution to Bosscoder Academy! 🚀\n\nHere's to many more milestones, bigger responsibilities, and continued growth ahead! 🤩✨`;
  }
  return 'Wishing you a very happy birthday, great health, and lots of success ahead! 🥳🎂';
}

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** The full post with `@Name` placeholders, as shown in the preview. */
export function composeMessage(opts: { mentionChannel: boolean; intro: string; celebrants: Celebrant[] }): string {
  const parts: string[] = [];
  const intro = opts.intro.trim();
  if (opts.mentionChannel || intro) parts.push([opts.mentionChannel ? '@channel' : '', intro].filter(Boolean).join(' '));
  // With several people each note says who it's for; with one it's obvious.
  const named = opts.celebrants.length > 1;
  for (const c of opts.celebrants) {
    const note = c.note.trim();
    if (note) parts.push(named ? `@${c.name} ${note}` : note);
  }
  return parts.join('\n\n');
}

/** Escape the characters Slack treats as markup. */
export function slackEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Slack-ready text: escapes markup, turns `@channel` into a channel ping, and tags each
 * person once — their first `@Full Name` becomes a real mention, later ones plain bold.
 * Names without a Slack account stay as "@Name" text.
 */
export function toSlackText(message: string, slackIdByName: Map<string, string | null>): string {
  const out = slackEscape(message).replace(/(^|\s)@channel\b/g, '$1<!channel>');
  // One pass, longest names first, so "@Gaurav Nath" is never read as "@Gaurav" + " Nath".
  const names = [...slackIdByName.keys()].sort((a, b) => b.length - a.length);
  if (names.length === 0) return out;
  const re = new RegExp(names.map((n) => `@${escapeRegExp(slackEscape(n))}`).join('|'), 'g');
  const tagged = new Set<string>();
  return out.replace(re, (match) => {
    const name = names.find((n) => `@${slackEscape(n)}` === match)!;
    if (tagged.has(name)) return `*${slackEscape(name)}*`;
    tagged.add(name);
    const id = slackIdByName.get(name);
    return id ? `<@${id}>` : match;
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** What the composer knows about each active employee. */
export interface CelebrationPerson {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  /** MM-DD, when HR or the employee has set it. */
  dob: string | null;
  /** YYYY-MM-DD */
  joined: string;
  photoURL: string | null;
}

export interface Occasion {
  person: CelebrationPerson;
  kind: CelebrationKind;
  years: number;
  /** Days from today (0 = today). */
  inDays: number;
}

/** Birthdays and work anniversaries from `todayISO` (YYYY-MM-DD) through the next `days` days. */
export function upcomingOccasions(people: CelebrationPerson[], todayISO: string, days: number): Occasion[] {
  const [y, m, d] = todayISO.split('-').map(Number);
  const out: Occasion[] = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(Date.UTC(y!, m! - 1, d! + i));
    const mmdd = date.toISOString().slice(5, 10);
    const year = date.getUTCFullYear();
    for (const p of people) {
      if (p.dob === mmdd) out.push({ person: p, kind: 'birthday', years: 0, inDays: i });
      const joinYear = Number(p.joined.slice(0, 4));
      if (p.joined.slice(5, 10) === mmdd && joinYear < year) {
        out.push({ person: p, kind: 'anniversary', years: year - joinYear, inDays: i });
      }
    }
  }
  return out;
}

/** Completed years at the most recent anniversary on/before today (min 1). */
export function yearsCompleted(joined: string, todayISO: string): number {
  const years = Number(todayISO.slice(0, 4)) - Number(joined.slice(0, 4)) - (todayISO.slice(5) < joined.slice(5) ? 1 : 0);
  return Math.max(1, years);
}

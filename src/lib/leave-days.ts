/**
 * Which calendar days a leave request covers. Sunday is the weekly off, so it is
 * never a leave day: ranges skip it, and the picker won't let anyone select it.
 *
 * A request stores `fromDate`/`toDate` (first and last day) and, from the new
 * picker on, `dates` — the exact days, which may be scattered ("20, 22, 24 Oct").
 * Older requests only have the range. All maths is on YYYY-MM-DD strings in UTC,
 * so the browser's time zone can't shift a day.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function isValidISODate(iso: string): boolean {
  return ISO_RE.test(iso) && toUTC(iso).toISOString().slice(0, 10) === iso;
}

export function addDaysISO(iso: string, n: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isSundayISO(iso: string): boolean {
  return toUTC(iso).getUTCDay() === 0;
}

/** Every working day (not Sunday) from `from` to `to`, inclusive. */
export function workingDaysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) if (!isSundayISO(d)) out.push(d);
  return out;
}

export interface LeaveDatesLike {
  fromDate: string;
  toDate: string;
  dates?: string[] | null;
}

/** The leave days of a request, sorted, Sundays excluded. */
export function leaveDates(req: LeaveDatesLike): string[] {
  if (req.dates && req.dates.length > 0) return [...req.dates].filter((d) => !isSundayISO(d)).sort();
  return workingDaysInRange(req.fromDate, req.toDate);
}

export function leaveDayCount(req: LeaveDatesLike): number {
  return leaveDates(req).length;
}

function short(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${parseInt(d!, 10)} ${MONTHS[parseInt(m!, 10) - 1]}`;
}

/**
 * Consecutive working days grouped into runs — a Sunday in between doesn't break a
 * run, so Sat + Mon reads as one stretch.
 */
export function groupRuns(dates: string[]): [string, string][] {
  const runs: [string, string][] = [];
  for (const d of [...dates].sort()) {
    const last = runs[runs.length - 1];
    if (last) {
      let next = addDaysISO(last[1], 1);
      if (isSundayISO(next)) next = addDaysISO(next, 1);
      if (next === d) { last[1] = d; continue; }
    }
    runs.push([d, d]);
  }
  return runs;
}

/** "20 Oct", "20 Oct – 24 Oct", "20 Oct, 22 Oct – 24 Oct". */
export function formatLeaveDates(req: LeaveDatesLike): string {
  const dates = leaveDates(req);
  if (dates.length === 0) return short(req.fromDate);
  return groupRuns(dates)
    .map(([a, b]) => (a === b ? short(a) : `${short(a)} – ${short(b)}`))
    .join(', ');
}

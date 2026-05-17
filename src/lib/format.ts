/**
 * Deterministic, timezone-free date formatters.
 *
 * `toLocaleDateString()` / `toLocaleString()` use the runtime's locale + TZ,
 * so the SSR (Node, UTC) and client (browser) produce different strings and
 * trigger React hydration mismatches. Always use these helpers instead.
 *
 * All output is in UTC.
 */

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  const day = d.getUTCDate();
  const mon = MONTHS_SHORT[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${mon} ${year}`;
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '—';
  return `${formatDate(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function formatIsoDate(d: Date | null | undefined): string {
  if (!d) return '';
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

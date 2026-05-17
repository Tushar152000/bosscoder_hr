import type { ReviewCycle } from '@/types/review';

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_OPTIONS = MONTHS_LONG.map((label, i) => ({
  value: i + 1, // 1-12
  label,
}));

export interface CyclePeriod {
  /** Year in the cycle name, or null if unparseable. */
  year: number | null;
  /** 1-12. Monthly cycles → [n]. Quarterly cycles → 3 consecutive months. Unparseable → []. */
  months: number[];
}

/** Parse `"April 2026"` / `"Q2 2026"` / unknown → year + covered months. */
export function cyclePeriod(c: ReviewCycle): CyclePeriod {
  const name = c.name.trim();
  const monthName = MONTHS_LONG.find((m) => name.startsWith(m));
  if (monthName) {
    const yr = parseInt(name.slice(monthName.length).trim(), 10);
    if (Number.isFinite(yr)) {
      return { year: yr, months: [MONTHS_LONG.indexOf(monthName) + 1] };
    }
  }
  const qm = /^Q([1-4])\s+(\d{4})$/.exec(name);
  if (qm) {
    const q = parseInt(qm[1], 10);
    const yr = parseInt(qm[2], 10);
    const start = (q - 1) * 3 + 1;
    return { year: yr, months: [start, start + 1, start + 2] };
  }
  return { year: null, months: [] };
}

/**
 * Apply year + month filters. Either filter can be `null` (no constraint).
 * Cycles with unparseable names only match when both filters are null.
 */
export function cycleMatchesPeriod(
  c: ReviewCycle,
  filterYear: number | null,
  filterMonth: number | null
): boolean {
  if (filterYear == null && filterMonth == null) return true;
  const p = cyclePeriod(c);
  if (filterYear != null && p.year !== filterYear) return false;
  if (filterMonth != null && !p.months.includes(filterMonth)) return false;
  return true;
}

/** Distinct years extracted from `cycles`, descending (newest first). */
export function availableYears(cycles: ReviewCycle[]): number[] {
  const set = new Set<number>();
  for (const c of cycles) {
    const p = cyclePeriod(c);
    if (p.year != null) set.add(p.year);
  }
  return [...set].sort((a, b) => b - a);
}

/** Parse a searchParam `'2026'` → 2026; bad/missing → null. */
export function parseYearParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 2000 || n > 2100) return null;
  return n;
}

/** Parse a searchParam `'4'` → 4; bad/missing → null. */
export function parseMonthParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return n;
}

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

/**
 * Derive Indian FY string directly from a cycle name string.
 * Works for monthly ("April 2025") and quarterly ("Q1 2025") names.
 */
export function cycleFYFromName(cycleName: string): string | null {
  const name = cycleName.trim();
  const monthName = MONTHS_LONG.find((m) => name.startsWith(m));
  if (monthName) {
    const yr = parseInt(name.slice(monthName.length).trim(), 10);
    if (Number.isFinite(yr)) {
      const month = MONTHS_LONG.indexOf(monthName) + 1;
      const fyYear = month >= 4 ? yr : yr - 1;
      return `FY ${fyYear}-${String(fyYear + 1).slice(-2)}`;
    }
  }
  const qm = /^Q([1-4])\s+(\d{4})$/.exec(name);
  if (qm) {
    const q = parseInt(qm[1], 10);
    const yr = parseInt(qm[2], 10);
    const startMonth = (q - 1) * 3 + 1;
    const fyYear = startMonth >= 4 ? yr : yr - 1;
    return `FY ${fyYear}-${String(fyYear + 1).slice(-2)}`;
  }
  return null;
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

/**
 * Derive Indian fiscal year string for a cycle.
 * Months 1–3 (Jan–Mar) belong to the previous FY.
 * e.g. "April 2025" → "FY 2025-26", "January 2026" → "FY 2025-26".
 */
export function cycleFY(c: ReviewCycle): string | null {
  const { year, month, quarter } = c;
  if (!year) return null;
  const startMonth = month ?? (quarter != null ? (quarter - 1) * 3 + 1 : null);
  const fyYear = startMonth == null || startMonth >= 4 ? year : year - 1;
  return `FY ${fyYear}-${String(fyYear + 1).slice(-2)}`;
}

/** Distinct FY strings from cycles, descending (newest first). */
export function availableFYs(cycles: ReviewCycle[]): string[] {
  const set = new Set<string>();
  for (const c of cycles) {
    const fy = cycleFY(c);
    if (fy) set.add(fy);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

/** Parse `'FY 2025-26'` → same string; bad/missing → null. */
export function parseFYParam(v: string | undefined): string | null {
  if (!v) return null;
  return /^FY \d{4}-\d{2}$/.test(v) ? v : null;
}

/**
 * Compute the effective deadline for a cycle.
 * Closed cycles → closedAt. Open monthly cycles → last day of that month.
 * Open quarterly cycles → last day of the last month in the quarter.
 * Fallback → openedAt + 30/90 days.
 */
export function computeCycleDeadline(c: ReviewCycle): Date | null {
  if (c.status === 'closed') return c.closedAt ?? null;
  const p = cyclePeriod(c);
  if (p.year && p.months.length > 0) {
    const lastMonth = p.months[p.months.length - 1];
    // new Date(year, lastMonth, 0) = last day of lastMonth (months are 0-indexed in JS)
    return new Date(p.year, lastMonth, 0, 23, 59, 59);
  }
  if (c.openedAt) {
    const days = c.cadence === 'quarterly' ? 90 : 30;
    return new Date(c.openedAt.getTime() + days * 864e5);
  }
  return null;
}

/** Parse status param. Maps UI alias 'scheduled' → 'draft'. */
export function parseStatusFilter(
  v: string | undefined,
): ReviewCycle['status'] | null {
  if (v === 'open') return 'open';
  if (v === 'closed') return 'closed';
  if (v === 'scheduled') return 'draft';
  return null;
}

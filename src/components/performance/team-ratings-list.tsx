'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { RatingChart, type RatingPoint } from '@/components/performance/rating-chart';
import { StatCard } from '@/components/performance/stat-card';
import { initials, cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission } from '@/types/review';

export interface TeamMemberSummary {
  employeeId: string;
  displayName: string;
  email: string;
  designation: string;
  department: string;
  /** Submitted manager-evals where this employee is the SUBJECT, oldest → newest. */
  history: ReviewSubmission[];
}

interface Props {
  rows: TeamMemberSummary[];
}

/**
 * Accordion list of a manager's direct reports. Each row shows a quick summary
 * (latest rating + trend arrow); clicking opens an inline panel with the
 * person's full rating chart, stats, and links to their recent submissions.
 */
export function TeamRatingsList({ rows }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-default bg-card">
      <ul className="divide-y divide-[rgb(var(--border))]">
        {rows.map((row) => {
          const isOpen = openId === row.employeeId;
          return (
            <li key={row.employeeId}>
              <button
                type="button"
                onClick={() =>
                  setOpenId((cur) => (cur === row.employeeId ? null : row.employeeId))
                }
                className={cn(
                  'flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]',
                  isOpen && 'bg-white/[0.03]'
                )}
                aria-expanded={isOpen}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-500/15 text-sm font-semibold text-accent-200 ring-1 ring-accent-500/30">
                    {initials(row.displayName, row.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      {row.displayName}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {row.designation}
                      {row.department && <> · {row.department}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <RatingSummary history={row.history} />
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted transition-transform',
                      isOpen && 'rotate-180'
                    )}
                  />
                </div>
              </button>

              {isOpen && <ExpandedPanel row={row} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RatingSummary({ history }: { history: ReviewSubmission[] }) {
  const ratings = history
    .map((s) => s.managerOverallRating)
    .filter((r): r is number => typeof r === 'number');

  if (ratings.length === 0) {
    return <span className="text-xs text-muted">No ratings yet</span>;
  }

  const last = ratings[ratings.length - 1];
  const prev = ratings.length > 1 ? ratings[ratings.length - 2] : null;
  const trend = prev != null ? last - prev : 0;
  // Lower is better in Bosscoder's scale (1 best, 5 worst), so a NEGATIVE
  // trend (rating dropping) is GOOD.
  const trendIsGood = trend < -0.05;
  const trendIsBad = trend > 0.05;

  const tone =
    last <= 2
      ? 'text-emerald-300'
      : last <= 3
      ? 'text-white'
      : last <= 4
      ? 'text-amber-300'
      : 'text-red-300';

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className={cn('text-lg font-semibold tabular-nums', tone)}>
          {last.toFixed(1)}
          <span className="ml-0.5 text-xs font-medium text-muted">/5</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted">
          {ratings.length} {ratings.length === 1 ? 'cycle' : 'cycles'}
        </div>
      </div>
      {prev != null && (trendIsGood || trendIsBad) && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            trendIsGood && 'bg-emerald-500/15 text-emerald-300',
            trendIsBad && 'bg-amber-500/15 text-amber-300'
          )}
          title={trendIsGood ? 'Improving (rating closer to 1)' : 'Slipping'}
        >
          {trendIsGood ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}
        </span>
      )}
    </div>
  );
}

function ExpandedPanel({ row }: { row: TeamMemberSummary }) {
  const ratings = row.history
    .map((s) => s.managerOverallRating)
    .filter((r): r is number => typeof r === 'number');

  const lastRating = ratings.length > 0 ? ratings[ratings.length - 1] : null;
  const avgQuarterly = avg(ratings.slice(-3));
  const avgFy = avg(ratings);

  const chartData: RatingPoint[] = row.history.map((s) => ({
    label: shortLabel(s.cycleName),
    rating: s.managerOverallRating ?? null,
  }));

  return (
    <div className="border-t border-default bg-card-elevated px-5 py-5">
      {row.history.length === 0 ? (
        <p className="text-sm text-muted">
          No submitted manager-evaluations yet for {row.displayName}. Once a cycle
          closes with a rating, their trend chart will populate here.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="rounded-lg border border-default bg-card p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Rating trend
            </p>
            <RatingChart data={chartData} averageLine={avgFy} height={220} />
          </div>
          <div className="space-y-3">
            <StatCard
              label="Latest rating"
              value={lastRating != null ? lastRating.toFixed(1) : '—'}
              unit={lastRating != null ? '/5' : undefined}
              hint={
                lastRating != null
                  ? row.history[row.history.length - 1]?.cycleName
                  : 'No data'
              }
            />
            <StatCard
              label="Avg (last 3)"
              value={avgQuarterly != null ? avgQuarterly.toFixed(1) : '—'}
              unit={avgQuarterly != null ? '/5' : undefined}
              hint="Most recent 3 cycles"
            />
            <StatCard
              label="Avg (all-time)"
              value={avgFy != null ? avgFy.toFixed(1) : '—'}
              unit={avgFy != null ? '/5' : undefined}
              hint={`Across ${ratings.length} ${ratings.length === 1 ? 'cycle' : 'cycles'}`}
            />
          </div>
        </div>
      )}

      {row.history.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Recent evaluations
          </p>
          <ul className="mt-2 divide-y divide-[rgb(var(--border))] rounded-lg border border-default bg-card">
            {row.history.slice(-5).reverse().map((s) => (
              <li key={s.submissionId}>
                <Link
                  href={`/performance/submissions/${s.submissionId}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.02]"
                >
                  <div>
                    <div className="font-medium text-white">{s.cycleName}</div>
                    <div className="text-xs text-muted">
                      {s.submittedAt
                        ? `Submitted ${formatDate(s.submittedAt)}`
                        : 'Pending submission'}{' '}
                      · by {s.reviewerName}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {typeof s.managerOverallRating === 'number' && (
                      <span className="text-base font-semibold tabular-nums text-white">
                        {s.managerOverallRating.toFixed(1)}
                        <span className="ml-0.5 text-xs font-medium text-muted">/5</span>
                      </span>
                    )}
                    <ExternalLink className="h-4 w-4 text-muted" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function avg(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function shortLabel(cycleName: string): string {
  const m = MONTHS_LONG.find((mm) => cycleName.startsWith(mm));
  if (m) {
    const idx = MONTHS_LONG.indexOf(m);
    const yr = cycleName.slice(m.length).trim().slice(-2);
    return `${MONTHS_SHORT[idx]} ${yr}`;
  }
  const q = /^Q(\d)\s+(\d{4})$/.exec(cycleName);
  if (q) return `Q${q[1]} ${q[2].slice(-2)}`;
  return cycleName;
}

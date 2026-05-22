'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronDown, ClipboardList, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { RatingChart, type RatingPoint } from '@/components/performance/rating-chart';
import { StatCard } from '@/components/performance/stat-card';
import { initials, cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { colorForName } from '@/lib/directory/colors';
import {
  MANAGER_RATING_KEYS,
  MANAGER_RATING_LABELS,
  type ReviewSubmission,
} from '@/types/review';

export interface OpenCycleEval {
  cycleName: string;
  /** Self-eval status for this person in the open cycle. null = no form generated yet. */
  selfStatus: ReviewSubmission['status'] | null;
  /** Submission ID of the manager-eval form where the logged-in user is the reviewer. null = not their manager. */
  managerSubId: string | null;
  managerStatus: ReviewSubmission['status'] | null;
}

export interface TeamMemberSummary {
  employeeId: string;
  displayName: string;
  email: string;
  designation: string;
  department: string;
  managerName: string | null;
  history: ReviewSubmission[];
  /** Current open cycle evaluation info. null = no open cycle. */
  openCycleEval: OpenCycleEval | null;
}

export function TeamRatingsList({ rows }: { rows: TeamMemberSummary[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-card">
      <ul className="divide-y divide-[#E2E8F0]">
        {rows.map((row) => {
          const isOpen = openId === row.employeeId;
          const avatarBg = colorForName(row.displayName ?? row.email);
          const oce = row.openCycleEval;
          return (
            <li key={row.employeeId}>
              {/* Row header — split so Link can coexist with the expand toggle */}
              <div
                className={cn(
                  'flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-[#F8FAFC]',
                  isOpen && 'bg-[#F8FAFC]',
                )}
              >
                {/* Left: avatar + name (click to expand) */}
                <button
                  type="button"
                  onClick={() => setOpenId((cur) => (cur === row.employeeId ? null : row.employeeId))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white ring-2 ring-white shadow-sm"
                    style={{ background: avatarBg }}
                  >
                    {initials(row.displayName, row.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-900">{row.displayName}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {row.designation}{row.department && <> · {row.department}</>}
                    </p>
                    {row.managerName && (
                      <p className="truncate text-[10px] text-slate-400 mt-0.5">
                        Manager: <span className="font-medium text-slate-500">{row.managerName}</span>
                      </p>
                    )}
                  </div>
                </button>

                {/* Right: current cycle actions + rating summary + chevron */}
                <div className="flex shrink-0 items-center gap-2.5">
                  {/* Self-eval status pill */}
                  {oce && (
                    <SelfStatusPill status={oce.selfStatus} />
                  )}
                  {/* Manager-eval action button */}
                  {oce?.managerSubId && (() => {
                    const isFinal = oce.managerStatus === 'submitted' || oce.managerStatus === 'locked';
                    const selfDone = oce.selfStatus === 'submitted';
                    if (isFinal) {
                      return (
                        <Link
                          href={`/performance/submissions/${oce.managerSubId}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition border border-[#E2E8F0] bg-white text-slate-600 hover:bg-[#F8FAFC]"
                        >
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      );
                    }
                    if (!selfDone) {
                      return (
                        <span
                          title="Waiting for self-evaluation"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium border border-[#E2E8F0] bg-[#F8FAFC] text-slate-400 cursor-not-allowed"
                        >
                          Evaluate <ArrowRight className="h-3 w-3" />
                        </span>
                      );
                    }
                    return (
                      <Link
                        href={`/performance/submissions/${oce.managerSubId}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition bg-[#0C447C] text-white hover:bg-[#0a3a6a]"
                      >
                        Evaluate <ArrowRight className="h-3 w-3" />
                      </Link>
                    );
                  })()}
                  <RatingSummary history={row.history} />
                  <button
                    type="button"
                    onClick={() => setOpenId((cur) => (cur === row.employeeId ? null : row.employeeId))}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                </div>
              </div>

              {isOpen && <ExpandedPanel row={row} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Self-eval status pill ─────────────────────────────────────────────────────

function SelfStatusPill({ status }: { status: ReviewSubmission['status'] | null }) {
  if (!status) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-medium text-slate-400">
      <Clock className="h-2.5 w-2.5" />
      No self-eval
    </span>
  );
  if (status === 'submitted' || status === 'locked') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-medium text-[#0F6E56]">
      <CheckCircle2 className="h-2.5 w-2.5" />
      Self-eval done
    </span>
  );
  if (status === 'in-progress') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-medium text-[#854F0B]">
      <ClipboardList className="h-2.5 w-2.5" />
      In progress
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-medium text-slate-500">
      <ClipboardList className="h-2.5 w-2.5" />
      Not started
    </span>
  );
}

// ── Row summary ───────────────────────────────────────────────────────────────

function RatingSummary({ history }: { history: ReviewSubmission[] }) {
  const ratings = history
    .map((s) => s.managerOverallRating)
    .filter((r): r is number => typeof r === 'number');

  if (ratings.length === 0)
    return <span className="text-[12px] text-slate-400">No ratings yet</span>;

  const last = ratings[ratings.length - 1];
  const prev = ratings.length > 1 ? ratings[ratings.length - 2] : null;
  const trend = prev != null ? last - prev : 0;
  const trendIsGood = trend < -0.05;
  const trendIsBad  = trend > 0.05;

  const tone =
    last <= 2 ? 'text-[#0F6E56]'
    : last <= 3 ? 'text-slate-900'
    : last <= 4 ? 'text-[#854F0B]'
    : 'text-[#993C1D]';

  return (
    <div className="flex items-center gap-2.5">
      <div className="text-right">
        <div className={cn('text-[18px] font-semibold tabular-nums leading-none', tone)}>
          {last.toFixed(1)}
          <span className="ml-0.5 text-[11px] font-medium text-slate-400">/5</span>
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
          {ratings.length} {ratings.length === 1 ? 'cycle' : 'cycles'}
        </div>
      </div>
      {prev != null && (trendIsGood || trendIsBad) && (
        <span className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
          trendIsGood && 'bg-[#E1F5EE] text-[#0F6E56]',
          trendIsBad  && 'bg-[#FAEEDA] text-[#854F0B]',
        )}>
          {trendIsGood ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ── Expanded panel ────────────────────────────────────────────────────────────

function ExpandedPanel({ row }: { row: TeamMemberSummary }) {
  // null = all-time trend view; a submissionId = that cycle's breakdown
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const submitted = row.history.filter(
    (s) => s.status === 'submitted' || s.status === 'locked',
  );
  const selected = submitted.find((s) => s.submissionId === selectedId) ?? null;

  const ratings = submitted
    .map((s) => s.managerOverallRating)
    .filter((r): r is number => typeof r === 'number');

  const avgFy = avg(ratings);

  const chartData: RatingPoint[] = submitted.map((s) => ({
    label:  shortLabel(s.cycleName),
    rating: s.managerOverallRating ?? null,
  }));

  return (
    <div className="border-t border-[#E2E8F0] bg-[#FAFAF7] px-5 py-5 space-y-4">

      {/* ── Current open cycle ── */}
      {row.openCycleEval && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.8px] text-slate-400">
            Current cycle · {row.openCycleEval.cycleName}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[11px] text-slate-500 mb-1">Self-evaluation</p>
                <SelfStatusPill status={row.openCycleEval.selfStatus} />
              </div>
              {row.openCycleEval.managerSubId && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-1">Your evaluation</p>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    row.openCycleEval.managerStatus === 'submitted' || row.openCycleEval.managerStatus === 'locked'
                      ? 'bg-[#E1F5EE] text-[#0F6E56]'
                      : row.openCycleEval.managerStatus === 'in-progress'
                      ? 'bg-[#FAEEDA] text-[#854F0B]'
                      : 'border border-[#E2E8F0] bg-[#F8FAFC] text-slate-500',
                  )}>
                    {row.openCycleEval.managerStatus === 'submitted' || row.openCycleEval.managerStatus === 'locked'
                      ? 'Submitted'
                      : row.openCycleEval.managerStatus === 'in-progress'
                      ? 'In progress'
                      : 'Not started'}
                  </span>
                </div>
              )}
            </div>
            {row.openCycleEval.managerSubId && (() => {
              const isFinal = row.openCycleEval.managerStatus === 'submitted' || row.openCycleEval.managerStatus === 'locked';
              const selfDone = row.openCycleEval.selfStatus === 'submitted';
              if (isFinal) {
                return (
                  <Link
                    href={`/performance/submissions/${row.openCycleEval.managerSubId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition border border-[#E2E8F0] bg-white text-slate-700 hover:bg-[#F8FAFC]"
                  >
                    View evaluation <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                );
              }
              if (!selfDone) {
                return (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium border border-[#E2E8F0] bg-[#F8FAFC] text-slate-400 cursor-not-allowed">
                      Fill out evaluation <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[11px] text-amber-600">Waiting for self-evaluation to be submitted first.</p>
                  </div>
                );
              }
              return (
                <Link
                  href={`/performance/submissions/${row.openCycleEval.managerSubId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition bg-[#0C447C] text-white hover:bg-[#0a3a6a]"
                >
                  Fill out evaluation <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              );
            })()}
            {!row.openCycleEval.managerSubId && (
              <p className="text-[12px] text-slate-400">You are not assigned to evaluate this person.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Cycle selector ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[12px] font-medium transition',
            selectedId === null
              ? 'bg-[#0C447C] text-white'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:border-slate-300',
          )}
        >
          All time
        </button>
        {submitted.length === 0 && (
          <span className="text-[12px] text-slate-400">No submitted evaluations yet</span>
        )}
        {submitted.slice().reverse().map((s) => (
          <button
            key={s.submissionId}
            type="button"
            onClick={() => setSelectedId(s.submissionId)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[12px] font-medium transition',
              selectedId === s.submissionId
                ? 'bg-[#0C447C] text-white'
                : 'bg-white border border-[#E2E8F0] text-slate-600 hover:border-slate-300',
            )}
          >
            {s.cycleName}
          </button>
        ))}
      </div>

      {/* ── All-time trend view ── */}
      {selectedId === null && (
        submitted.length === 0 ? (
          <p className="text-[13px] text-slate-500">
            No submitted evaluations yet for {row.displayName}. Once a cycle closes with a rating, the trend chart will appear here.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.8px] text-slate-400">
                Rating trend
              </p>
              <RatingChart data={chartData} averageLine={avgFy} height={200} />
            </div>
            <div className="flex flex-col gap-2.5">
              <StatCard
                label="Latest rating"
                value={ratings.length > 0 ? ratings[ratings.length - 1].toFixed(1) : '—'}
                unit={ratings.length > 0 ? '/5' : undefined}
                hint={submitted[submitted.length - 1]?.cycleName}
              />
              <StatCard
                label="Avg · last 3"
                value={avg(ratings.slice(-3)) != null ? avg(ratings.slice(-3))!.toFixed(1) : '—'}
                unit={avg(ratings.slice(-3)) != null ? '/5' : undefined}
                hint="Most recent 3 cycles"
              />
              <StatCard
                label="Avg · all-time"
                value={avgFy != null ? avgFy.toFixed(1) : '—'}
                unit={avgFy != null ? '/5' : undefined}
                hint={`${ratings.length} ${ratings.length === 1 ? 'cycle' : 'cycles'} total`}
              />
            </div>
          </div>
        )
      )}

      {/* ── Single-cycle breakdown view ── */}
      {selectedId !== null && selected && (
        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          {/* Rating bars */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-card space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.8px] text-slate-400">
              Rating breakdown · {selected.cycleName}
            </p>
            {MANAGER_RATING_KEYS.map((key) => {
              const val = selected.managerRatings?.[key];
              const pct = val != null ? ((5 - val) / 4) * 100 : 0; // 1=best so invert for bar fill
              const barColor =
                val == null ? 'bg-slate-200'
                : val <= 2  ? 'bg-[#0F6E56]'
                : val <= 3  ? 'bg-[#0C447C]'
                : val <= 4  ? 'bg-[#854F0B]'
                : 'bg-[#993C1D]';
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-slate-600">{MANAGER_RATING_LABELS[key]}</span>
                    <span className="text-[13px] font-semibold tabular-nums text-slate-900">
                      {val != null ? `${val.toFixed(1)}/5` : '—'}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    {val != null && (
                      <div
                        className={cn('h-2 rounded-full transition-all', barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall + meta */}
          <div className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.8px] text-slate-400 mb-2">
                Overall
              </p>
              {selected.managerOverallRating != null ? (
                <p className={cn(
                  'text-[36px] font-semibold tabular-nums leading-none',
                  selected.managerOverallRating <= 2 ? 'text-[#0F6E56]'
                  : selected.managerOverallRating <= 3 ? 'text-slate-900'
                  : selected.managerOverallRating <= 4 ? 'text-[#854F0B]'
                  : 'text-[#993C1D]',
                )}>
                  {selected.managerOverallRating.toFixed(2)}
                  <span className="ml-0.5 text-[16px] font-medium text-slate-400">/5</span>
                </p>
              ) : (
                <p className="text-[28px] font-semibold text-slate-300">—</p>
              )}
              {selected.submittedAt && (
                <p className="mt-2 text-[10px] text-slate-400">
                  Submitted {formatDate(selected.submittedAt)}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-slate-400">by {selected.reviewerName}</p>
            </div>

            <Link
              href={`/performance/submissions/${selected.submissionId}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-card transition hover:bg-[#F8FAFC]"
            >
              View full form
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── No submission for selected cycle ── */}
      {selectedId !== null && !selected && (
        <p className="text-[13px] text-slate-500">
          No submitted evaluation found for this cycle.
        </p>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function shortLabel(cycleName: string): string {
  const m = MONTHS_LONG.find((mm) => cycleName.startsWith(mm));
  if (m) {
    const idx = MONTHS_LONG.indexOf(m);
    const yr  = cycleName.slice(m.length).trim().slice(-2);
    return `${MONTHS_SHORT[idx]} ${yr}`;
  }
  const q = /^Q(\d)\s+(\d{4})$/.exec(cycleName);
  if (q) return `Q${q[1]} ${q[2].slice(-2)}`;
  return cycleName;
}

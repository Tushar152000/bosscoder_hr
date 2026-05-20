'use client';

import type React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  LineChart,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn, initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission } from '@/types/review';
import type { TeamMemberSummary } from './team-ratings-list';

export interface ReportWithHistory extends TeamMemberSummary {
  /** Open/in-progress manager-evals where current user is reviewer + this person is subject. */
  pendingSubs: ReviewSubmission[];
}

interface Props {
  reports: ReportWithHistory[];
}

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function shortLabel(cycleName: string): string {
  const m = MONTHS_LONG.find((mm) => cycleName.startsWith(mm));
  if (m) {
    const idx = MONTHS_LONG.indexOf(m);
    const yr = cycleName.slice(m.length).trim().slice(-2);
    return `${MONTHS_SHORT[idx]} '${yr}`;
  }
  const q = /^Q(\d)\s+(\d{4})$/.exec(cycleName);
  if (q) return `Q${q[1]} '${q[2].slice(-2)}`;
  return cycleName.slice(0, 6);
}

function ratingColor(r: number): string {
  if (r >= 4.0) return 'text-[#0F6E56]';
  if (r >= 3.0) return 'text-[#854F0B]';
  return 'text-[#993C1D]';
}

function avg(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function MyTeamRail({ reports }: Props) {
  const defaultOpen =
    reports.find((r) => r.history.some((s) => s.managerOverallRating != null))
      ?.employeeId ?? null;

  const [openId, setOpenId] = useState<string | null>(defaultOpen);

  if (reports.length === 0) return null;

  return (
    <div className="sticky top-4 self-start flex flex-col gap-2.5">
      <div className="bg-surface border border-divider rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-divider">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#EEEDFE] flex items-center justify-center shrink-0">
              <Users size={13} color="#534AB7" />
            </div>
            <span className="text-[13px] font-medium text-slate-900">My team</span>
            <span className="inline-flex items-center text-[9px] font-medium text-slate-500 bg-surface-muted border border-divider px-1.5 py-0.5 rounded-full">
              {reports.length} {reports.length === 1 ? 'report' : 'reports'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Direct reports and their rating history.
          </p>
        </div>

        {/* Report rows */}
        {reports.map((report, i) => {
          const isLast = i === reports.length - 1;
          const isExpanded = openId === report.employeeId;

          const ratings = report.history
            .map((s) => s.managerOverallRating)
            .filter((r): r is number => typeof r === 'number');

          const latestRating = ratings.length > 0 ? ratings[ratings.length - 1] : null;
          const prevRating = ratings.length > 1 ? ratings[ratings.length - 2] : null;
          const delta =
            latestRating != null && prevRating != null ? latestRating - prevRating : null;
          const avgLast3 = avg(ratings.slice(-3));

          const chartData = report.history
            .filter((s) => s.managerOverallRating != null)
            .slice(-6)
            .map((s) => ({
              id: s.submissionId,
              label: shortLabel(s.cycleName),
              rating: s.managerOverallRating as number,
            }));

          // Recent: pending first (newest), then submitted (newest first), capped at 3
          const recentPending = report.pendingSubs.slice(0, 2).map((s) => ({
            cycleLabel: s.cycleName,
            status: 'pending' as const,
            rating: null as number | null,
            submittedAt: null as Date | null,
            formId: s.submissionId,
          }));
          const recentSubmitted = report.history
            .slice(-3)
            .reverse()
            .map((s) => ({
              cycleLabel: s.cycleName,
              status: 'submitted' as const,
              rating: s.managerOverallRating,
              submittedAt: s.submittedAt,
              formId: s.submissionId,
            }));
          const recent = [...recentPending, ...recentSubmitted].slice(0, 3);

          const color = colorForName(report.displayName);
          const inits = initials(report.displayName, report.email);

          return (
            <div key={report.employeeId} className={cn(!isLast && 'border-b border-divider')}>
              {/* Collapsed row / header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(isExpanded ? null : report.employeeId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    setOpenId(isExpanded ? null : report.employeeId);
                }}
                className={cn(
                  'px-3.5 py-3 cursor-pointer hover:bg-surface-muted transition-colors select-none',
                  isExpanded && 'bg-[#FAFBFC]',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {inits}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-900 truncate">
                      {report.displayName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {report.designation} · {report.department}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {latestRating != null ? (
                      <>
                        <div className="flex items-baseline justify-end gap-0.5">
                          <span className={cn('text-[15px] font-medium tabular-nums', ratingColor(latestRating))}>
                            {latestRating.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">/5</span>
                        </div>
                        {delta != null && delta !== 0 && (
                          <div
                            className={cn(
                              'inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-0.5',
                              delta > 0 ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#FAECE7] text-[#993C1D]',
                            )}
                          >
                            {delta > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {Math.abs(delta).toFixed(2)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No ratings yet</span>
                    )}
                  </div>

                  <ChevronDown
                    size={13}
                    className={cn(
                      'text-slate-400 transition-transform shrink-0',
                      isExpanded && 'rotate-180',
                    )}
                  />
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 bg-[#FAFBFC] border-t border-slate-100">
                  {ratings.length === 0 ? (
                    <div className="mt-2.5 border border-dashed border-divider rounded-md p-3.5 text-center bg-surface">
                      <LineChart size={20} className="text-slate-400 mx-auto mb-1.5" />
                      <p className="text-[11px] text-slate-600">No completed evaluations yet</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Rating history will appear here once this user has at least one submitted cycle.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mini trend chart */}
                      <div className="mt-2.5 bg-surface-muted border border-divider rounded-md p-2.5 mb-2.5">
                        <p className="text-[9px] font-medium tracking-[0.8px] uppercase text-slate-400 mb-1.5">
                          Rating trend
                        </p>
                        <div style={{ width: '100%', height: 60 }}>
                          <ResponsiveContainer>
                            <AreaChart
                              data={chartData}
                              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient
                                  id={`railGrad-${report.employeeId}`}
                                  x1="0" y1="0" x2="0" y2="1"
                                >
                                  <stop offset="0%" stopColor="#0C447C" stopOpacity={0.12} />
                                  <stop offset="100%" stopColor="#0C447C" stopOpacity={0.01} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="label" hide />
                              <YAxis domain={[1, 5]} hide />
                              <Tooltip
                                contentStyle={{
                                  background: '#ffffff',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  color: '#1e293b',
                                  padding: '4px 8px',
                                }}
                                labelStyle={{ color: '#64748b', marginBottom: 2 }}
                                formatter={(value: unknown) => typeof value === 'number' ? [`${value.toFixed(2)} / 5`, 'Rating'] : ['—', '']}
                              />
                              <Area
                                type="monotone"
                                dataKey="rating"
                                stroke="#0C447C"
                                strokeWidth={1.5}
                                fill={`url(#railGrad-${report.employeeId})`}
                                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                                  const { cx = 0, cy = 0, index } = props;
                                  const isLatest = index === chartData.length - 1;
                                  return isLatest ? (
                                    <circle
                                      key={`dot-last-${index}`}
                                      cx={cx}
                                      cy={cy}
                                      r={3}
                                      fill="#0C447C"
                                      stroke="white"
                                      strokeWidth={1.5}
                                    />
                                  ) : (
                                    <circle
                                      key={`dot-${index}`}
                                      cx={cx}
                                      cy={cy}
                                      r={2.5}
                                      fill="#0C447C"
                                    />
                                  );
                                }}
                                activeDot={{ r: 4, fill: '#0C447C', stroke: 'white', strokeWidth: 1.5 }}
                                connectNulls
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        {/* X-axis cycle labels */}
                        <div className="flex justify-between mt-1">
                          {chartData.map((d) => (
                            <span key={d.id} className="text-[8px] text-slate-400">
                              {d.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Stat tiles */}
                      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                        <div className="bg-surface border border-divider rounded-[5px] px-2 py-1.5">
                          <p className="text-[8px] font-medium tracking-[0.5px] uppercase text-slate-400">
                            Latest
                          </p>
                          <p className="text-[13px] font-medium text-slate-900 tabular-nums">
                            {latestRating!.toFixed(1)}
                            <span className="text-[9px] text-slate-400 font-normal">/5</span>
                          </p>
                        </div>
                        <div className="bg-surface border border-divider rounded-[5px] px-2 py-1.5">
                          <p className="text-[8px] font-medium tracking-[0.5px] uppercase text-slate-400">
                            Avg last 3
                          </p>
                          <p className="text-[13px] font-medium text-slate-900 tabular-nums">
                            {avgLast3 != null ? (
                              <>
                                {avgLast3.toFixed(1)}
                                <span className="text-[9px] text-slate-400 font-normal">/5</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Recent evaluations */}
                      {recent.length > 0 && (
                        <div className="mb-2.5 pt-2 border-t border-divider">
                          <p className="text-[9px] font-medium tracking-[0.8px] uppercase text-slate-400 mb-1">
                            Recent
                          </p>
                          {recent.map((item) => (
                            <Link
                              key={item.formId}
                              href={`/performance/submissions/${item.formId}`}
                              className="flex items-center justify-between py-1 px-0.5 rounded hover:bg-surface transition-colors"
                            >
                              <div>
                                <p className="text-[10px] font-medium text-slate-900">
                                  {item.cycleLabel}
                                </p>
                                <p className="text-[9px] text-slate-500">
                                  {item.status === 'pending'
                                    ? 'Pending'
                                    : `Submitted ${item.submittedAt ? formatDate(item.submittedAt) : ''}`}
                                </p>
                              </div>
                              <div className="shrink-0">
                                {item.status === 'pending' || item.rating == null ? (
                                  <span className="text-[9px] text-slate-400 italic">—</span>
                                ) : (
                                  <span className={cn('text-[11px] font-medium tabular-nums', ratingColor(item.rating))}>
                                    {item.rating.toFixed(1)}
                                    <span className="text-[8px] text-slate-400 font-normal">/5</span>
                                  </span>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Footer: view full history */}
                  <Link
                    href={`/performance?view=team`}
                    className="mt-2 w-full bg-surface border border-divider rounded-md py-1.5 text-[10px] font-medium text-brand hover:bg-surface-muted flex items-center justify-center gap-1 transition-colors"
                  >
                    View full history
                    <ArrowRight size={11} />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

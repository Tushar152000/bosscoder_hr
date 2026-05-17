'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  Code2,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { nudgePendingEmployees } from '@/app/(app)/performance/actions';
import {
  TeamRatingsList,
  type TeamMemberSummary,
} from '@/components/performance/team-ratings-list';

export interface DeptStat {
  name: string;
  headcount: number;
  pendingCount: number;
  avgRating: number | null;
  ratingDelta: number | null;
  managerName: string | null;
}

export interface OrgStats {
  totalActive: number;
  totalPending: number;
  orgAvgRating: number | null;
  orgRatingDelta: number | null;
}

interface SearchableEmployee {
  employeeId: string;
  displayName: string;
  department: string;
}

interface AdminBrowseSectionProps {
  deptStats: DeptStat[];
  orgStats: OrgStats;
  openCycleId: string | null;
  openCycleName: string | null;
  daysUntilClose: number | null;
  lastClosedCycleName: string | null;
  decliningCount: number;
  incompleteMgrCount: number;
  searchableEmployees: SearchableEmployee[];
}

// ─── Dept colour palette ──────────────────────────────────────────────────────

type DeptTheme = {
  bg: string;
  text: string;
  Icon: typeof Building2;
};

function deptTheme(name: string): DeptTheme {
  const n = name.toLowerCase();
  if (/engineer|tech|dev|software|product|platform/.test(n))
    return { bg: 'bg-[#EBF3FE]', text: 'text-[#0C447C]', Icon: Code2 };
  if (/growth|market|content|brand/.test(n))
    return { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]', Icon: TrendingUp };
  if (/sales|revenue|biz|business/.test(n))
    return { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', Icon: Briefcase };
  if (/ops|operation|infra|finance|support/.test(n))
    return { bg: 'bg-[#FAECE7]', text: 'text-[#993C1D]', Icon: Settings };
  return { bg: 'bg-[#F1EFE8]', text: 'text-[#5F5E5A]', Icon: Building2 };
}

// ─── AdminBrowseSection ───────────────────────────────────────────────────────

export function AdminBrowseSection({
  deptStats,
  orgStats,
  openCycleId,
  openCycleName,
  daysUntilClose,
  lastClosedCycleName,
  decliningCount,
  incompleteMgrCount,
  searchableEmployees,
}: AdminBrowseSectionProps) {
  const [query, setQuery] = useState('');
  const [nudgeState, setNudgeState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return searchableEmployees.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [query, searchableEmployees]);

  function handleNudge() {
    if (!openCycleId) return;
    startTransition(async () => {
      setNudgeState('pending');
      const res = await nudgePendingEmployees(openCycleId);
      setNudgeState(res.ok ? 'done' : 'error');
    });
  }

  // Dynamic subtitle
  let subtitle: string;
  if (openCycleName) {
    const parts: string[] = [];
    if (orgStats.totalPending > 0) parts.push(`${orgStats.totalPending} pending`);
    if (daysUntilClose != null) {
      parts.push(
        daysUntilClose <= 0
          ? 'deadline passed'
          : daysUntilClose === 1
          ? 'closes tomorrow'
          : `closes in ${daysUntilClose} days`,
      );
    }
    subtitle = parts.length > 0 ? `${openCycleName} · ${parts.join(' · ')}` : openCycleName;
  } else if (lastClosedCycleName) {
    subtitle = `No active cycle · Last closed: ${lastClosedCycleName}`;
  } else {
    subtitle = 'Pick a department to view members and rating trends.';
  }

  const showAttention = decliningCount > 0 || incompleteMgrCount > 0;
  const canNudge = !!openCycleId && orgStats.totalPending > 0;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EBF3FE]">
            <Users className="h-[18px] w-[18px] text-[#0C447C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-slate-900">Browse employees</h2>
              {orgStats.totalPending > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 tabular-nums">
                  {orgStats.totalPending} pending
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>
          </div>
        </div>

        {/* Search + Nudge */}
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees…"
              className="h-8 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 transition focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {canNudge && (
            <button
              type="button"
              onClick={handleNudge}
              disabled={isPending || nudgeState === 'done'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition',
                nudgeState === 'done'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : nudgeState === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <Bell className="h-3.5 w-3.5" />
              {nudgeState === 'done'
                ? 'Sent!'
                : nudgeState === 'error'
                ? 'Failed — retry'
                : isPending
                ? 'Sending…'
                : 'Nudge pending'}
            </button>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <div className="relative sm:hidden">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employees…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 transition focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Attention strip */}
      {showAttention && !filtered && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-amber-800">
            {decliningCount > 0 && (
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                {decliningCount}{' '}
                {decliningCount === 1 ? 'employee' : 'employees'} with declining ratings
              </span>
            )}
            {incompleteMgrCount > 0 && (
              <span>
                {incompleteMgrCount}{' '}
                {incompleteMgrCount === 1 ? 'manager' : 'managers'} with incomplete reviews
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search results */}
      {filtered ? (
        <SearchResults employees={filtered} onClear={() => setQuery('')} />
      ) : deptStats.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Org-wide aggregate card */}
          <AllEmployeesCard orgStats={orgStats} openCycleName={openCycleName} />
          {/* Dept cards */}
          {deptStats.map((dept) => (
            <DeptCard key={dept.name} dept={dept} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── All-employees aggregate card ────────────────────────────────────────────

function AllEmployeesCard({
  orgStats,
  openCycleName,
}: {
  orgStats: OrgStats;
  openCycleName: string | null;
}) {
  return (
    <Link
      href="/performance?view=all"
      className="group flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:shadow-card-hover hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EBF3FE] text-[#0C447C] ring-1 ring-[#0C447C]/15">
          <Users className="h-5 w-5" />
        </div>
        {orgStats.totalPending > 0 && openCycleName && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 tabular-nums">
            {orgStats.totalPending} pending
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-slate-900">All employees</div>
        <div className="mt-0.5 text-[12px] text-slate-500">
          {orgStats.totalActive} active
        </div>
      </div>

      {orgStats.orgAvgRating != null && (
        <RatingRow avgRating={orgStats.orgAvgRating} ratingDelta={orgStats.orgRatingDelta} />
      )}

      <div className="flex items-center justify-end text-[11px] text-slate-400 group-hover:text-slate-600 transition">
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// ─── Dept card ────────────────────────────────────────────────────────────────

function DeptCard({ dept }: { dept: DeptStat }) {
  const { bg, text, Icon } = deptTheme(dept.name);
  return (
    <Link
      href={`/performance?view=dept&name=${encodeURIComponent(dept.name)}`}
      className="group flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:shadow-card-hover hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1',
            bg,
            text,
            'ring-current/15',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {dept.pendingCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 tabular-nums">
            {dept.pendingCount} pending
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-slate-900">{dept.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-slate-500">
          <span>{dept.headcount} {dept.headcount === 1 ? 'person' : 'people'}</span>
          {dept.managerName && (
            <>
              <span className="text-slate-300">·</span>
              <span className="truncate">{dept.managerName}</span>
            </>
          )}
        </div>
      </div>

      {dept.avgRating != null && (
        <RatingRow avgRating={dept.avgRating} ratingDelta={dept.ratingDelta} />
      )}

      <div className="flex items-center justify-end text-[11px] text-slate-400 group-hover:text-slate-600 transition">
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// ─── Rating row ───────────────────────────────────────────────────────────────

function RatingRow({
  avgRating,
  ratingDelta,
}: {
  avgRating: number;
  ratingDelta: number | null;
}) {
  const deltaPositive = ratingDelta != null && ratingDelta > 0;
  const deltaNegative = ratingDelta != null && ratingDelta < 0;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="font-semibold text-slate-700 tabular-nums">{avgRating.toFixed(2)}</span>
      <span className="text-slate-400">avg rating</span>
      {ratingDelta != null && Math.abs(ratingDelta) >= 0.01 && (
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-0.5 font-medium tabular-nums',
            deltaPositive ? 'text-emerald-600' : deltaNegative ? 'text-red-500' : 'text-slate-400',
          )}
        >
          {deltaPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(ratingDelta).toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ─── Search results ───────────────────────────────────────────────────────────

function SearchResults({
  employees,
  onClear,
}: {
  employees: SearchableEmployee[];
  onClear: () => void;
}) {
  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-5 text-[13px] text-slate-500">
        No employees match your search.{' '}
        <button onClick={onClear} className="font-medium text-[#0C447C] hover:underline">
          Clear
        </button>
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white">
      {employees.slice(0, 30).map((e) => (
        <Link
          key={e.employeeId}
          href={`/employees/${e.employeeId}`}
          className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] transition hover:bg-slate-50"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{e.displayName}</div>
            <div className="truncate text-[12px] text-slate-500">{e.department}</div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Link>
      ))}
      {employees.length > 30 && (
        <div className="px-4 py-2.5 text-[12px] text-slate-500">
          +{employees.length - 30} more — refine your search
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-5 text-[13px] text-slate-500">
      <span className="font-medium text-slate-700">No departments found.</span> Add employees to
      see department breakdown here.
    </div>
  );
}

// ─── DrillSection (unchanged — used by admin drill-in and manager team view) ──

export function DrillSection({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: TeamMemberSummary[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <Link
          href="/performance"
          className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-700 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to departments
        </Link>
        <h2 className="mt-1 text-[15px] font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-5 text-[13px] text-slate-500">
          No employees here yet.
        </div>
      ) : (
        <TeamRatingsList rows={rows} />
      )}
    </section>
  );
}

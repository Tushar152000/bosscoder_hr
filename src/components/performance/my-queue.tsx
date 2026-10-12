'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { AlertCircle, ClipboardList, SlidersHorizontal, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cycleFYFromName } from '@/lib/performance/cycle-period';
import {
  FormCard,
  cycleDeadline,
  daysUntil,
  urgencyOf,
  type Enriched,
} from './form-card';
import { SubmittedCard, getSubmittedVariant } from './submitted-card';
import type { ReviewCycle, ReviewSubmission } from '@/types/review';

type Tab = 'open' | 'urgent' | 'submitted' | 'closed';
type Cadence = 'all' | 'monthly' | 'quarterly';

const CADENCE_LABELS: Record<Cadence, string> = {
  all:       'All cycles',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
};

const TAB_LABELS: Record<Tab, string> = {
  open:      'Open',
  urgent:    'Needs action',
  submitted: 'Submitted',
  closed:    'Closed',
};
// Team/manager view: a completed manager-eval reads as "Reviewed" rather than "Submitted".
const MANAGER_TAB_LABELS: Record<Tab, string> = { ...TAB_LABELS, submitted: 'Reviewed' };

interface Props {
  submissions: ReviewSubmission[];
  cyclesById: Record<string, ReviewCycle>;
  kind?: 'self' | 'manager';
  hasRail?: boolean;
  mgrEvalByCycle?: Record<string, ReviewSubmission>;
  prevRatingByCycle?: Record<string, number | null>;
  selfEvalStatusById?: Record<string, string>;
}

export function MyQueue({
  submissions,
  cyclesById,
  kind,
  hasRail = false,
  mgrEvalByCycle,
  prevRatingByCycle,
  selfEvalStatusById = {},
}: Props) {
  const now = useMemo(() => new Date(), []);

  // Global filters
  const [filterFY, setFilterFY]           = useState<string | null>(null);
  const [filterCadence, setFilterCadence] = useState<Cadence>('all');
  // Submitted-tab sort
  const [subSort, setSubSort] = useState<'newest' | 'oldest'>('newest');

  const enriched = useMemo<Enriched[]>(() => {
    const base = kind ? submissions.filter((s) => s.kind === kind) : submissions;
    return base.map((sub) => {
      const cycle = cyclesById[sub.cycleId];
      const deadline = cycle ? cycleDeadline(cycle) : null;
      const daysLeft = deadline ? daysUntil(deadline, now) : null;
      const isPending = sub.status === 'not-started' || sub.status === 'in-progress';
      const urgency = urgencyOf(sub.status, daysLeft);
      const isUrgent = isPending && (urgency === 'critical' || urgency === 'overdue');
      const selfEvalStatus = sub.kind === 'manager'
        ? (selfEvalStatusById[`${sub.cycleId}::${sub.subjectEmployeeId}`] ?? null)
        : null;
      return { sub, deadline, daysLeft, isPending, isUrgent, urgency, selfEvalStatus };
    });
  }, [submissions, cyclesById, kind, now, selfEvalStatusById]);

  // FY options derived from ALL items (before filtering)
  const fyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of enriched) {
      const fy = cycleFYFromName(e.sub.cycleName);
      if (fy) set.add(fy);
    }
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [enriched]);

  // Apply global filters
  const filteredEnriched = useMemo(() => {
    return enriched.filter((e) => {
      if (filterFY && cycleFYFromName(e.sub.cycleName) !== filterFY) return false;
      if (filterCadence !== 'all') {
        const cadence = cyclesById[e.sub.cycleId]?.cadence;
        if (cadence !== filterCadence) return false;
      }
      return true;
    });
  }, [enriched, filterFY, filterCadence, cyclesById]);

  const hasActiveFilter = filterFY != null || filterCadence !== 'all';

  const buckets = useMemo(() => {
    const open: Enriched[] = [];
    const urgent: Enriched[] = [];
    const submitted: Enriched[] = [];
    const closed: Enriched[] = [];
    for (const e of filteredEnriched) {
      if (e.sub.status === 'locked') closed.push(e);
      else if (e.sub.status === 'submitted') submitted.push(e);
      else {
        open.push(e);
        if (e.isUrgent) urgent.push(e);
      }
    }
    open.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    urgent.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    submitted.sort((a, b) => (b.sub.submittedAt?.getTime() ?? 0) - (a.sub.submittedAt?.getTime() ?? 0));
    closed.sort((a, b) => (b.sub.lockedAt?.getTime() ?? 0) - (a.sub.lockedAt?.getTime() ?? 0));
    return { open, urgent, submitted, closed };
  }, [filteredEnriched]);

  const [tab, setTab] = useState<Tab>(() => {
    if (buckets.urgent.length > 0) return 'urgent';
    if (buckets.open.length > 0) return 'open';
    if (buckets.submitted.length > 0) return 'submitted';
    return 'closed';
  });

  const sortedSubmitted = useMemo(() => {
    return subSort === 'oldest' ? [...buckets.submitted].reverse() : buckets.submitted;
  }, [buckets.submitted, subSort]);

  const submittedStats = useMemo(() => {
    if (kind !== 'self' || !mgrEvalByCycle) return null;
    let reviewed = 0, awaiting = 0, overdue = 0;
    for (const e of sortedSubmitted) {
      const mgr = mgrEvalByCycle[e.sub.cycleId];
      const v = getSubmittedVariant(mgr, e.sub);
      if (v === 'reviewed') reviewed++;
      else if (v === 'overdue') overdue++;
      else awaiting++;
    }
    return { reviewed, awaiting, overdue };
  }, [kind, mgrEvalByCycle, sortedSubmitted]);

  const visible = tab === 'submitted' ? sortedSubmitted : buckets[tab];

  // Applied filters, shown as removable chips under the tabs.
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filterFY) activeChips.push({ key: 'fy', label: filterFY, clear: () => setFilterFY(null) });
  if (filterCadence !== 'all') {
    activeChips.push({ key: 'cadence', label: CADENCE_LABELS[filterCadence], clear: () => setFilterCadence('all') });
  }
  if (tab === 'submitted' && subSort === 'oldest') {
    activeChips.push({ key: 'sort', label: 'Oldest first', clear: () => setSubSort('newest') });
  }
  const clearAll = () => { setFilterFY(null); setFilterCadence('all'); setSubSort('newest'); };

  const isSelf    = kind === 'self';
  const isManager = kind === 'manager';
  const Icon      = isManager ? Users : ClipboardList;
  const iconBg    = isManager ? 'bg-[#EEEDFE]' : 'bg-[#EBF3FE]';
  const iconColor = isManager ? 'text-[#534AB7]' : 'text-[#0C447C]';
  const title     = isManager ? 'Team evaluations' : 'My evaluations';
  const subtitle  = isManager
    ? 'Evaluation forms for your direct reports.'
    : 'Your self-evaluation forms across all cycles.';
  const activeBg  = isManager ? 'bg-[#534AB7]' : 'bg-[#0C447C]';

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', iconBg)}>
            <Icon className={cn('h-[18px] w-[18px]', iconColor)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
              {buckets.open.length > 0 && (
                <span className={cn(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  isManager ? 'bg-[#EEEDFE] text-[#534AB7]' : 'bg-[#EBF3FE] text-[#0C447C]',
                )}>
                  {buckets.open.length} open
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>
          </div>
        </div>

        {buckets.urgent.length > 0 && tab !== 'urgent' && (
          <button
            type="button"
            onClick={() => setTab('urgent')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100 transition"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {buckets.urgent.length} need{buckets.urgent.length === 1 ? 's' : ''} action
          </button>
        )}
      </div>

      {/* Tabs + filter button */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 pb-1 pt-2">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
            const tabLabels = isManager ? MANAGER_TAB_LABELS : TAB_LABELS;
            const isDanger = t === 'urgent';
            const count = t === 'submitted' ? sortedSubmitted.length : buckets[t].length;
            const rawCount = buckets[t].length;
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[14px] font-medium transition',
                  isActive
                    ? isDanger ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : cn(activeBg, 'text-white')
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                )}
              >
                {tabLabels[t]}
                <span className={cn(
                  'inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  isActive
                    ? isDanger ? 'bg-red-100 text-red-700' : 'bg-white/20 text-white'
                    : isDanger && rawCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {(fyOptions.length > 0 || tab === 'submitted') && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-[12px] font-medium transition',
                  activeChips.length > 0
                    ? 'border-[#B5D4F4] text-[#0C447C]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
                {activeChips.length > 0 && (
                  <span className="inline-flex min-w-[1.1rem] justify-center rounded-full bg-[#0C447C] px-1 text-[10px] font-semibold tabular-nums text-white">
                    {activeChips.length}
                  </span>
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                className="z-50 w-[calc(100vw-32px)] sm:w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl outline-none space-y-3"
              >
                {fyOptions.length > 0 && (
                  <FilterGroup label="Financial year">
                    <OptionChip active={filterFY == null} onClick={() => setFilterFY(null)}>All</OptionChip>
                    {fyOptions.map((fy) => (
                      <OptionChip key={fy} active={filterFY === fy} onClick={() => setFilterFY(fy)}>
                        {fy}
                      </OptionChip>
                    ))}
                  </FilterGroup>
                )}
                {fyOptions.length > 0 && (
                  <FilterGroup label="Cycle type">
                    {(['all', 'monthly', 'quarterly'] as Cadence[]).map((c) => (
                      <OptionChip key={c} active={filterCadence === c} onClick={() => setFilterCadence(c)}>
                        {CADENCE_LABELS[c]}
                      </OptionChip>
                    ))}
                  </FilterGroup>
                )}
                {tab === 'submitted' && (
                  <FilterGroup label="Sort">
                    <OptionChip active={subSort === 'newest'} onClick={() => setSubSort('newest')}>Newest first</OptionChip>
                    <OptionChip active={subSort === 'oldest'} onClick={() => setSubSort('oldest')}>Oldest first</OptionChip>
                  </FilterGroup>
                )}
                {activeChips.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[11px] text-slate-500 hover:text-slate-700 transition underline underline-offset-2"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {/* Active filters as removable chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {activeChips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 rounded-full border border-[#B5D4F4] bg-[#EBF3FE] py-0.5 pl-2.5 pr-1 text-[11px] font-medium text-[#0C447C]"
            >
              {c.label}
              <button
                type="button"
                onClick={c.clear}
                aria-label={`Remove ${c.label}`}
                className="grid h-4 w-4 place-items-center rounded-full hover:bg-[#0C447C]/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-[11px] text-slate-500 hover:text-slate-700 transition underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Cards */}
      {visible.length === 0 ? (
        <EmptyState tab={tab} hasFilter={hasActiveFilter} isManager={isManager} />
      ) : (
        <>
          <div className={cn(
            'grid grid-cols-1 gap-3',
            hasRail ? 'md:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3',
          )}>
            {visible.map((e) =>
              tab === 'submitted' && isSelf && mgrEvalByCycle ? (
                <SubmittedCard
                  key={e.sub.submissionId}
                  self={e.sub}
                  mgrEval={mgrEvalByCycle[e.sub.cycleId]}
                  prevRating={prevRatingByCycle?.[e.sub.cycleId]}
                />
              ) : (
                <FormCard key={e.sub.submissionId} item={e} />
              ),
            )}
          </div>

          {/* Info bar — submitted + self only */}
          {tab === 'submitted' && submittedStats && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-slate-500">
              <span>
                <span className="font-medium text-slate-700">{sortedSubmitted.length}</span>{' '}
                submission{sortedSubmitted.length !== 1 ? 's' : ''}
              </span>
              {submittedStats.reviewed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0F6E56]" />
                  {submittedStats.reviewed} reviewed
                </span>
              )}
              {submittedStats.awaiting > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {submittedStats.awaiting} awaiting review
                </span>
              )}
              {submittedStats.overdue > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  {submittedStats.overdue} overdue
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function OptionChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
        active
          ? 'border-[#0C447C] bg-[#0C447C] text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab, hasFilter, isManager }: { tab: Tab; hasFilter?: boolean; isManager?: boolean }) {
  if (hasFilter) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-5 text-[13px] text-slate-500">
        <span className="font-medium text-slate-700">No results.</span>{' '}
        No forms match the selected filters. Try clearing the FY or cadence filter.
      </div>
    );
  }
  const map: Record<Tab, { title: string; body: string }> = {
    open:      { title: 'All caught up.',      body: 'No open forms right now.' },
    urgent:    { title: 'Nothing urgent.',     body: 'No forms due within the next 14 days.' },
    submitted: isManager
      ? { title: 'No reviews yet.',      body: 'Reports you evaluate will appear here.' }
      : { title: 'No submissions yet.',  body: 'Forms you submit will appear here.' },
    closed:    { title: 'No closed forms.',    body: 'Forms from closed cycles will appear here.' },
  };
  const m = map[tab];
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-5 text-[13px] text-slate-500">
      <span className="font-medium text-slate-700">{m.title}</span> {m.body}
    </div>
  );
}

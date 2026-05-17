'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as RadixSelect from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  ChevronDown,
  Clock,
  Filter,
  Plus,
  X,
} from 'lucide-react';
import type { ReactNode, ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { MONTH_OPTIONS } from '@/lib/performance/cycle-period';
import type { ReviewCycle } from '@/types/review';

const MONTH_NAMES: Record<number, string> = Object.fromEntries(
  MONTH_OPTIONS.map((m) => [m.value, m.label]),
);

interface Props {
  /** Already-filtered cycle rows to display. */
  cycles: ReviewCycle[];
  /** Total unfiltered count — for the strip's "Showing N cycles". */
  allCount: number;
  /** FY option strings for the dropdown, newest first. */
  fyOptions: string[];
  /** Active FY filter, e.g. "FY 2025-26". */
  fy: string | null;
  /** Active month filter (1–12). */
  month: number | null;
  /** Raw URL status param: 'open' | 'closed' | 'scheduled' | null. */
  statusParam: string | null;
  /** Current view/name params to preserve on filter navigation. */
  view?: string | null;
  viewName?: string | null;
}

export function CyclesTable({
  cycles,
  allCount,
  fyOptions,
  fy,
  month,
  statusParam,
  view,
  viewName,
}: Props) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const monthVal = month ? String(month) : '';
  const activeCount = [fy, monthVal || null, statusParam].filter(Boolean).length;
  const hasFilters = activeCount > 0;

  function buildUrl(
    overrides: Partial<Record<'fy' | 'month' | 'status', string | null>>,
  ) {
    const next = {
      fy:     'fy'     in overrides ? overrides.fy     : fy,
      month:  'month'  in overrides ? overrides.month  : monthVal || null,
      status: 'status' in overrides ? overrides.status : statusParam,
    };
    const params = new URLSearchParams();
    if (view)         params.set('view', view);
    if (viewName)     params.set('name', viewName);
    if (next.fy)      params.set('fy', next.fy);
    if (next.month)   params.set('month', next.month);
    if (next.status)  params.set('status', next.status);
    const qs = params.toString();
    return `/performance${qs ? `?${qs}` : ''}`;
  }

  function update(key: 'fy' | 'month' | 'status', value: string) {
    router.replace(buildUrl({ [key]: value || null }), { scroll: false });
  }

  function clearOne(key: 'fy' | 'month' | 'status') {
    router.replace(buildUrl({ [key]: null }), { scroll: false });
  }

  function clearAll() {
    router.replace(buildUrl({ fy: null, month: null, status: null }), {
      scroll: false,
    });
  }

  const statusOpts = [
    { value: 'open',      label: 'Open'      },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'closed',    label: 'Closed'    },
  ];

  const ORDER: Record<ReviewCycle['status'], number> = { open: 0, draft: 1, closed: 2 };
  const sorted = [...cycles].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div className="overflow-hidden rounded-xl border border-divider bg-surface">
      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-4 py-3">
        {/* Left: title + subtitle */}
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">
            Evaluation cycles
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Open or close cycles. Opening assigns forms to every active employee
            and their manager.
          </p>
        </div>

        {/* Right: filter controls + divider + New cycle button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Desktop: three inline dropdowns */}
          <div className="hidden md:flex items-center gap-1.5">
            <FilterSelect
              value={fy ?? ''}
              onValueChange={(v) => update('fy', v)}
              placeholder="All years"
              icon={Calendar}
              options={fyOptions.map((f) => ({ value: f, label: f }))}
            />
            <FilterSelect
              value={monthVal}
              onValueChange={(v) => update('month', v)}
              placeholder="All months"
              options={MONTH_OPTIONS.map((m) => ({
                value: String(m.value),
                label: m.label,
              }))}
            />
            <FilterSelect
              value={statusParam ?? ''}
              onValueChange={(v) => update('status', v)}
              placeholder="All status"
              options={statusOpts}
            />
          </div>

          {/* Mobile: single "Filters" button */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-divider rounded-md text-[11px] text-slate-900 hover:bg-surface-muted transition"
          >
            <Filter className="h-3 w-3 text-slate-400" />
            Filters
            {activeCount > 0 && (
              <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          {/* Vertical divider */}
          <div className="w-px h-5 bg-divider mx-1" />

          {/* New cycle */}
          <Link
            href="/performance/cycles/new"
            className="inline-flex items-center gap-1.5 bg-brand text-white rounded-md px-3 py-1.5 text-[12px] font-medium hover:bg-brand-hover transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New cycle
          </Link>
        </div>
      </div>

      {/* ── Active filters strip ────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-surface-muted border-b border-divider">
          <span className="text-[10px] font-medium tracking-[0.5px] uppercase text-slate-400">
            Filtered by
          </span>
          {fy && (
            <FilterChip label={fy} onRemove={() => clearOne('fy')} />
          )}
          {month && (
            <FilterChip
              label={MONTH_NAMES[month] ?? String(month)}
              onRemove={() => clearOne('month')}
            />
          )}
          {statusParam && (
            <FilterChip
              label={
                statusParam.charAt(0).toUpperCase() + statusParam.slice(1)
              }
              onRemove={() => clearOne('status')}
            />
          )}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-[10px] text-slate-500 underline underline-offset-2 hover:text-slate-700 transition"
          >
            Clear all
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-slate-500">
            Showing {cycles.length}{' '}
            {cycles.length === 1 ? 'cycle' : 'cycles'}
          </span>
        </div>
      )}

      {/* ── Table content ───────────────────────────────────────────── */}
      {cycles.length === 0 ? (
        <div className="px-5 py-6 text-[13px] text-slate-500">
          {hasFilters ? (
            <>
              No cycles match the current filters.{' '}
              <button
                type="button"
                onClick={clearAll}
                className="text-brand hover:underline"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              No cycles yet.{' '}
              <Link
                href="/performance/cycles/new"
                className="text-brand hover:underline"
              >
                Create the first one →
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Column header */}
          <div className="grid grid-cols-[1fr_120px_130px_90px] gap-4 bg-surface-muted px-5 py-2.5 text-[11px] uppercase tracking-wider text-slate-400">
            <span>Cycle</span>
            <span className="text-right">Self</span>
            <span className="text-right">Manager</span>
            <span className="text-right">Status</span>
          </div>
          {sorted.map((c) => (
            <CycleRow key={c.cycleId} cycle={c} />
          ))}
        </>
      )}

      {/* ── Mobile filter dialog ────────────────────────────────────── */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
          <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-8 focus:outline-none">
            <Dialog.Title className="text-[14px] font-semibold text-slate-900 mb-4">
              Filters
            </Dialog.Title>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1.5 block">
                  Fiscal year
                </label>
                <FilterSelect
                  value={fy ?? ''}
                  onValueChange={(v) => { update('fy', v); }}
                  placeholder="All years"
                  icon={Calendar}
                  options={fyOptions.map((f) => ({ value: f, label: f }))}
                  fullWidth
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1.5 block">
                  Month
                </label>
                <FilterSelect
                  value={monthVal}
                  onValueChange={(v) => { update('month', v); }}
                  placeholder="All months"
                  options={MONTH_OPTIONS.map((m) => ({
                    value: String(m.value),
                    label: m.label,
                  }))}
                  fullWidth
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1.5 block">
                  Status
                </label>
                <FilterSelect
                  value={statusParam ?? ''}
                  onValueChange={(v) => { update('status', v); }}
                  placeholder="All status"
                  options={statusOpts}
                  fullWidth
                />
              </div>
            </div>
            <div className="flex gap-2 pt-5">
              <button
                type="button"
                onClick={() => { clearAll(); setMobileOpen(false); }}
                className="flex-1 rounded-lg border border-divider bg-surface py-2.5 text-[13px] font-medium text-slate-700 hover:bg-surface-muted transition"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg bg-brand py-2.5 text-[13px] font-medium text-white hover:bg-brand-hover transition"
              >
                Done
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-surface border border-[#B5D4F4] rounded-full text-[10px] font-medium text-brand">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-3.5 h-3.5 rounded-full bg-brand-soft inline-flex items-center justify-center hover:bg-[#D5E6F7] transition"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-[9px] h-[9px] text-brand" />
      </button>
    </span>
  );
}

// Sentinel used as the Select.Item value for "clear / show all".
// Radix Select forbids value="" on Item elements.
const ALL_SENTINEL = '__all__';

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  icon: Icon,
  options,
  fullWidth,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  icon?: ComponentType<{ className?: string }>;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
}) {
  // Map empty → sentinel for the root; sentinel → empty when calling back.
  const rootValue = value || ALL_SENTINEL;

  return (
    <RadixSelect.Root
      value={rootValue}
      onValueChange={(v) => onValueChange(v === ALL_SENTINEL ? '' : v)}
    >
      <RadixSelect.Trigger
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5',
          'border border-divider rounded-md text-[11px] outline-none transition',
          'hover:bg-surface-muted',
          value ? 'bg-surface text-slate-900' : 'bg-surface text-slate-400',
          fullWidth && 'w-full',
        )}
      >
        {Icon && <Icon className="h-3 w-3 text-slate-400 shrink-0" />}
        <RadixSelect.Value placeholder={placeholder} />
        <ChevronDown className="h-2.5 w-2.5 text-slate-400 shrink-0 ml-auto" />
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 min-w-[9rem] overflow-hidden rounded-lg bg-white border border-divider shadow-lg"
          position="popper"
          sideOffset={4}
          align="start"
        >
          <RadixSelect.Viewport className="p-1">
            <SelectOption value={ALL_SENTINEL}>{placeholder}</SelectOption>
            {options.map((opt) => (
              <SelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </SelectOption>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

function SelectOption({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <RadixSelect.Item
      value={value}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-md px-2.5 py-1.5 pr-7',
        'text-[12px] text-slate-700 outline-none',
        'data-[highlighted]:bg-surface-muted data-[highlighted]:text-slate-900',
        'data-[state=checked]:text-brand data-[state=checked]:font-medium',
      )}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-2">
        <Check className="h-3 w-3 text-brand" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}

function CycleRow({ cycle: c }: { cycle: ReviewCycle }) {
  const isScheduled = c.status === 'draft';
  const Icon =
    c.status === 'open'
      ? CalendarCheck
      : isScheduled
      ? CalendarClock
      : CalendarX;
  const iconCls =
    c.status === 'open'
      ? 'text-[#0F6E56]'
      : isScheduled
      ? 'text-amber-500'
      : 'text-slate-400';

  const dateLine =
    c.status === 'open' && c.openedAt
      ? `Open since ${formatDate(c.openedAt)}`
      : c.status === 'closed' && c.closedAt
      ? `Closed ${formatDate(c.closedAt)}`
      : 'Not yet opened';

  const selfPct =
    c.selfCount > 0
      ? Math.round((c.selfSubmittedCount / c.selfCount) * 100)
      : 0;
  const mgrPct =
    c.managerCount > 0
      ? Math.round((c.managerSubmittedCount / c.managerCount) * 100)
      : 0;

  return (
    <Link
      href={`/performance/cycles/${c.cycleId}`}
      className="grid grid-cols-[1fr_120px_130px_90px] gap-4 items-center border-t border-divider px-5 py-3.5 hover:bg-surface-muted transition"
    >
      {/* Name + meta */}
      <div className="min-w-0 flex items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${iconCls}`} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-slate-900">
            {c.name}
          </div>
          <div className="text-[11px] text-slate-400">
            {c.cadence === 'monthly' ? 'Monthly' : 'Quarterly'} · {dateLine}
          </div>
        </div>
      </div>

      {/* Self */}
      <div className="flex flex-col items-end gap-1">
        {c.status === 'open' ? (
          <ProgressCell
            submitted={c.selfSubmittedCount}
            total={c.selfCount}
            pct={selfPct}
          />
        ) : isScheduled ? (
          <ScheduledCell />
        ) : (
          <span className="text-[12px] text-slate-400">—</span>
        )}
      </div>

      {/* Manager */}
      <div className="flex flex-col items-end gap-1">
        {c.status === 'open' ? (
          <ProgressCell
            submitted={c.managerSubmittedCount}
            total={c.managerCount}
            pct={mgrPct}
          />
        ) : isScheduled ? (
          <ScheduledCell />
        ) : (
          <span className="text-[12px] text-slate-400">—</span>
        )}
      </div>

      {/* Status */}
      <div className="flex justify-end">
        <CycleStatusPill status={c.status} />
      </div>
    </Link>
  );
}

function ProgressCell({
  submitted,
  total,
  pct,
}: {
  submitted: number;
  total: number;
  pct: number;
}) {
  return (
    <>
      <span className="text-[12px] tabular-nums text-slate-700">
        {submitted}/{total}
        <span className="ml-1 text-slate-400">({pct}%)</span>
      </span>
      <div className="w-20 h-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-brand transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );
}

function ScheduledCell() {
  return (
    <>
      <span className="text-[10px] text-slate-500">Not started</span>
      <div className="w-20 h-1 rounded-full bg-surface-muted" />
    </>
  );
}

function CycleStatusPill({ status }: { status: ReviewCycle['status'] }) {
  if (status === 'open')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E1F5EE] text-[#0F6E56]">
        Open
      </span>
    );
  if (status === 'closed')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
        Closed
      </span>
    );
  // draft → Scheduled
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">
      <Clock className="h-[9px] w-[9px]" />
      Scheduled
    </span>
  );
}

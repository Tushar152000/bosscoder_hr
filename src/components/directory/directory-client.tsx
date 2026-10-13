'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deptColor } from '@/lib/directory/colors';
import { CopyButton } from '@/components/ui/copy-button';
import { DirectoryHeader } from './directory-header';
import type { DirectoryPerson } from '@/types/directory';
import type { EmployeeStatus, EmploymentType } from '@/types/employee';

type GroupBy = 'dept' | 'manager' | 'none';
type Layout = 'list' | 'cards';
type SortKey = 'name' | 'dept' | 'joined';

const NO_DEPT = 'No department';
const TOP = '__top';
const NO_MANAGER = '__none';

type EvalKind = 'self' | 'manager';
const EVAL_LABEL: Record<EvalKind, string> = {
  self: 'Self-eval pending',
  manager: 'Manager review pending',
};

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'Active',
  'on-notice': 'On notice',
  left: 'Left',
};
const STATUS_DOT: Record<EmployeeStatus, string> = {
  active: 'bg-[#1D9E75]',
  'on-notice': 'bg-[#BA7517]',
  left: 'bg-slate-400',
};
const STATUS_PILL: Record<EmployeeStatus, string> = {
  active: '',
  'on-notice': 'bg-[#FAEEDA] text-[#854F0B]',
  left: 'bg-slate-100 text-slate-600',
};
const TYPE_LABEL: Record<EmploymentType, string> = {
  'full-time': 'Full-time',
  intern: 'Intern',
  contractor: 'Contractor',
};

const deptKey = (p: DirectoryPerson) => p.department || NO_DEPT;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

interface Props {
  people: DirectoryPerson[];
  totalEmployees: number;
  totalManagers: number;
  canCreate: boolean;
  /** HR and founders can see people on notice or who have left. */
  canFilterStatus: boolean;
  /** Open review cycle name when review progress is available (HR/cycle managers). */
  evalCycleName?: string | null;
}

interface Group {
  key: string;
  rows: DirectoryPerson[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Small pieces
// ─────────────────────────────────────────────────────────────────────────────

function PersonAvatar({ person, size }: { person: Pick<DirectoryPerson, 'name' | 'initials' | 'avatarColor' | 'photoURL'>; size: 'xs' | 'md' | 'lg' }) {
  const dim = size === 'xs' ? 'h-[22px] w-[22px] text-[9px]' : size === 'md' ? 'h-9 w-9 text-[12px]' : 'h-11 w-11 text-[14px]';
  if (person.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(dim, 'shrink-0 rounded-full object-cover')}
      />
    );
  }
  return (
    <span
      className={cn(dim, 'grid shrink-0 place-items-center rounded-full font-semibold text-white')}
      style={{ backgroundColor: person.avatarColor }}
    >
      {person.initials}
    </span>
  );
}

/** Wraps the first case-insensitive match of `q` in a highlight. */
function Highlight({ text, q }: { text: string; q: string }) {
  const s = q.trim();
  const i = s ? text.toLowerCase().indexOf(s.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-[#FDF0C8] px-px text-inherit">{text.slice(i, i + s.length)}</mark>
      {text.slice(i + s.length)}
    </>
  );
}

function StatusPill({ status }: { status: EmployeeStatus }) {
  if (status === 'active') return null;
  return (
    <span className={cn('ml-1.5 inline-flex shrink-0 rounded-full px-2 py-px align-[1px] text-[11px] font-semibold', STATUS_PILL[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function TypeTag({ type }: { type: EmploymentType }) {
  if (type === 'full-time') return null;
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2 py-px text-[11px] font-semibold text-slate-600">
      {TYPE_LABEL[type]}
    </span>
  );
}

function OptionChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition',
        active
          ? 'border-[#0C447C] bg-[#0C447C] text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode; aria?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex h-9 shrink-0 overflow-hidden rounded-lg border border-slate-200/70 bg-white">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          aria-label={o.aria}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 text-[12.5px] font-medium transition',
            value === o.value ? 'bg-[#EBF3FE] text-[#0C447C]' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export function DirectoryClient({ people, totalEmployees, totalManagers, canCreate, canFilterStatus, evalCycleName }: Props) {
  const [search, setSearch] = useState('');
  const [depts, setDepts] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<EmployeeStatus>>(new Set(['active']));
  const [types, setTypes] = useState<Set<EmploymentType>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>('dept');
  const [layout, setLayout] = useState<Layout>('list');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const [closed, setClosed] = useState<Set<string>>(new Set());
  // Review-progress filters: people whose self-eval / manager review is still pending.
  const [pending, setPending] = useState<Set<EvalKind>>(new Set());

  // Remember grouping and layout per browser.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('directory-view') ?? '{}');
      if (saved.groupBy === 'dept' || saved.groupBy === 'manager' || saved.groupBy === 'none') setGroupBy(saved.groupBy);
      if (saved.layout === 'list' || saved.layout === 'cards') setLayout(saved.layout);
    } catch {
      // storage unavailable
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('directory-view', JSON.stringify({ groupBy, layout }));
    } catch {
      // storage unavailable
    }
  }, [groupBy, layout]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const totalDepts = useMemo(() => new Set(people.map((p) => p.department).filter(Boolean)).size, [people]);

  const deptOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of people) m.set(deptKey(p), (m.get(deptKey(p)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => Number(a[0] === NO_DEPT) - Number(b[0] === NO_DEPT) || b[1] - a[1]);
  }, [people]);

  const typeOptions = useMemo(
    () => (Object.keys(TYPE_LABEL) as EmploymentType[]).filter((t) => people.some((p) => p.employmentType === t)),
    [people],
  );

  const statusIsDefault = statuses.size === 1 && statuses.has('active');

  // Pending counts among people still with the company.
  const pendingCount = useMemo(() => {
    const live = people.filter((p) => p.status !== 'left');
    return {
      self: live.filter((p) => p.evals?.self === 'pending').length,
      manager: live.filter((p) => p.evals?.manager === 'pending').length,
    };
  }, [people]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return people.filter((p) => {
      if (depts.size && !depts.has(deptKey(p))) return false;
      if (canFilterStatus && statuses.size && !statuses.has(p.status)) return false;
      if (types.size && !types.has(p.employmentType)) return false;
      if (pending.size && ![...pending].some((k) => p.evals?.[k] === 'pending')) return false;
      if (!q) return true;
      return [p.name, p.email, p.designation, deptKey(p), p.managerName ?? ''].some((v) => v.toLowerCase().includes(q));
    });
  }, [people, search, depts, statuses, types, canFilterStatus, pending]);

  const groups = useMemo<Group[]>(() => {
    const cmp = (a: DirectoryPerson, b: DirectoryPerson) => {
      const x = sort.key === 'joined' ? a.joinedISO : sort.key === 'dept' ? deptKey(a) : a.name;
      const y = sort.key === 'joined' ? b.joinedISO : sort.key === 'dept' ? deptKey(b) : b.name;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.name.localeCompare(b.name);
    };
    if (groupBy === 'none') return [{ key: 'all', rows: [...filtered].sort(cmp) }];

    const m = new Map<string, DirectoryPerson[]>();
    for (const p of filtered) {
      const key = groupBy === 'dept' ? deptKey(p) : p.managerId ?? (p.isFounder ? TOP : NO_MANAGER);
      const list = m.get(key) ?? [];
      list.push(p);
      m.set(key, list);
    }
    const rank = (k: string) =>
      groupBy === 'dept' ? Number(k === NO_DEPT) : k === TOP ? 0 : k === NO_MANAGER ? 2 : 1;
    return [...m.entries()]
      .map(([key, rows]) => ({ key, rows: rows.sort(cmp) }))
      .sort((a, b) => rank(a.key) - rank(b.key) || b.rows.length - a.rows.length);
  }, [filtered, groupBy, sort]);

  // ── applied filters as removable chips ──
  const chips: { key: string; label: string; clear: () => void }[] = [];
  for (const d of depts) {
    chips.push({ key: `d:${d}`, label: d, clear: () => setDepts((s) => { const n = new Set(s); n.delete(d); return n; }) });
  }
  if (canFilterStatus && !statusIsDefault) {
    chips.push({
      key: 'status',
      label: statuses.size ? `Status: ${[...statuses].map((s) => STATUS_LABEL[s]).join(', ')}` : 'Any status',
      clear: () => setStatuses(new Set(['active'])),
    });
  }
  for (const k of pending) {
    chips.push({ key: `e:${k}`, label: EVAL_LABEL[k], clear: () => setPending((s) => { const n = new Set(s); n.delete(k); return n; }) });
  }
  if (types.size) {
    chips.push({ key: 'type', label: `Type: ${[...types].map((t) => TYPE_LABEL[t]).join(', ')}`, clear: () => setTypes(new Set()) });
  }

  // Filters chosen inside the Filter menu (the review-progress toggles live in the toolbar).
  const menuFilterCount = chips.filter((c) => !c.key.startsWith('e:')).length;

  function clearAll() {
    setSearch('');
    setDepts(new Set());
    setStatuses(new Set(['active']));
    setTypes(new Set());
    setPending(new Set());
  }

  function toggleIn<T>(set: Set<T>, v: T): Set<T> {
    const n = new Set(set);
    if (n.has(v)) n.delete(v); else n.add(v);
    return n;
  }

  function sortBy(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'joined' ? -1 : 1 }));
  }

  // Columns change with grouping: the grouped-by field moves into the group header.
  const showDept = groupBy !== 'dept';
  const showManager = groupBy !== 'manager';
  const cols = [
    'minmax(250px,2.3fr)',
    showDept && 'minmax(140px,1.2fr)',
    showManager && 'minmax(150px,1.3fr)',
    '150px',
    '104px',
    '72px',
  ].filter(Boolean).join(' ');
  const statusHeader = canFilterStatus ? 'Status' : 'Type';
  const isFiltered = chips.length > 0 || search.trim() !== '';

  function groupTitle(g: Group) {
    if (groupBy === 'dept') {
      const lead = g.rows.filter((p) => p.reportsCount > 0).sort((a, b) => b.teamSize - a.teamSize)[0];
      return (
        <>
          <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ backgroundColor: deptColor(g.key === NO_DEPT ? '' : g.key) }} />
          <span className="truncate">{g.key}</span>
          <span className="font-medium tabular-nums text-slate-400">{g.rows.length}</span>
          {g.key === NO_DEPT && (
            <span className="shrink-0 rounded-full bg-[#FAEEDA] px-2 py-px text-[11px] font-semibold text-[#854F0B]">Needs setup</span>
          )}
          {lead && <span className="ml-auto hidden truncate text-[12px] font-normal text-slate-500 sm:inline">Led by {lead.name}</span>}
        </>
      );
    }
    if (g.key === TOP) {
      return <>Top of the org <span className="font-medium tabular-nums text-slate-400">{g.rows.length}</span></>;
    }
    if (g.key === NO_MANAGER) {
      return (
        <>
          <AlertTriangle size={15} className="shrink-0" />
          No manager set
          <span className="font-medium tabular-nums opacity-70">{g.rows.length}</span>
          <span className="ml-auto hidden truncate text-[12px] font-normal sm:inline">Open a profile to pick a manager</span>
        </>
      );
    }
    const m = byId.get(g.key);
    return (
      <>
        {m && <PersonAvatar person={m} size="xs" />}
        <span className="truncate">Reports to {m?.name ?? 'Unknown'}</span>
        <span className="font-medium tabular-nums text-slate-400">{g.rows.length}</span>
        {m && (
          <span className="ml-auto hidden truncate text-[12px] font-normal text-slate-500 sm:inline">
            {m.designation} · {deptKey(m)}
          </span>
        )}
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ── Header + toolbar ─────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-slate-200/70 bg-[#FAFAF7]/95 backdrop-blur-sm">
        <DirectoryHeader
          totalEmployees={totalEmployees}
          totalManagers={totalManagers}
          totalDepts={totalDepts}
          canCreate={canCreate}
        />

        <div className="space-y-2.5 px-4 pb-4 md:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 basis-full sm:max-w-[440px] sm:basis-auto">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, title or manager"
                aria-label="Search people"
                className="h-11 w-full rounded-lg border border-slate-200/70 bg-white pl-9 pr-9 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0C447C]/50 focus:ring-2 focus:ring-[#0C447C]/15 sm:h-9 sm:text-[13px]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 text-[12.5px] font-medium transition',
                    menuFilterCount
                      ? 'border-[#B5D4F4] bg-[#EBF3FE] text-[#0C447C]'
                      : 'border-slate-200/70 text-slate-600 hover:border-slate-300',
                  )}
                >
                  <SlidersHorizontal size={14} />
                  Filter
                  {menuFilterCount > 0 && (
                    <span className="inline-flex min-w-[18px] justify-center rounded-full bg-[#0C447C] px-1 text-[11px] font-semibold tabular-nums text-white">
                      {menuFilterCount}
                    </span>
                  )}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 w-[calc(100vw-32px)] space-y-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl outline-none sm:w-[360px]"
                >
                  <FilterGroup label="Department">
                    {deptOptions.map(([d, n]) => (
                      <OptionChip key={d} active={depts.has(d)} onClick={() => setDepts((s) => toggleIn(s, d))}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: deptColor(d === NO_DEPT ? '' : d) }} />
                        {d}
                        <span className={cn('tabular-nums', depts.has(d) ? 'text-[#B5D4F4]' : 'text-slate-400')}>{n}</span>
                      </OptionChip>
                    ))}
                  </FilterGroup>
                  {canFilterStatus && (
                    <FilterGroup label="Status">
                      {(Object.keys(STATUS_LABEL) as EmployeeStatus[]).map((s) => (
                        <OptionChip key={s} active={statuses.has(s)} onClick={() => setStatuses((cur) => toggleIn(cur, s))}>
                          {STATUS_LABEL[s]}
                        </OptionChip>
                      ))}
                    </FilterGroup>
                  )}
                  {typeOptions.length > 1 && (
                    <FilterGroup label="Employment type">
                      {typeOptions.map((t) => (
                        <OptionChip key={t} active={types.has(t)} onClick={() => setTypes((cur) => toggleIn(cur, t))}>
                          {TYPE_LABEL[t]}
                        </OptionChip>
                      ))}
                    </FilterGroup>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[12px] text-slate-500 underline underline-offset-2 transition hover:text-slate-700"
                    >
                      Reset
                    </button>
                    <Popover.Close asChild>
                      <button
                        type="button"
                        className="h-8 rounded-lg bg-[#0C447C] px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-[#0A3A6A]"
                      >
                        Show {plural(filtered.length, 'person', 'people')}
                      </button>
                    </Popover.Close>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {evalCycleName && (
              <div role="group" aria-label={`${evalCycleName} review progress`} className="flex items-center gap-1.5">
                {(['self', 'manager'] as EvalKind[]).map((k) => {
                  const on = pending.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPending((s) => toggleIn(s, k))}
                      aria-pressed={on}
                      title={`${evalCycleName}: people whose ${k === 'self' ? 'self-evaluation' : "manager's review"} isn't submitted yet`}
                      className={cn(
                        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium transition',
                        on
                          ? 'border-[#FAC775] bg-[#FAEEDA] text-[#854F0B]'
                          : 'border-slate-200/70 bg-white text-slate-600 hover:border-slate-300',
                      )}
                    >
                      {k === 'self' ? <ClipboardList size={14} /> : <UserCheck size={14} />}
                      {EVAL_LABEL[k]}
                      <span
                        className={cn(
                          'inline-flex min-w-[20px] justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                          on ? 'bg-[#854F0B] text-white' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {pendingCount[k]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <Segmented<GroupBy>
              label="Group by"
              value={groupBy}
              onChange={(v) => { setGroupBy(v); setClosed(new Set()); }}
              options={[
                { value: 'dept', label: 'Department' },
                { value: 'manager', label: 'Manager' },
                { value: 'none', label: 'A–Z' },
              ]}
            />
            <Segmented<Layout>
              label="Layout"
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'list', label: <List size={15} />, aria: 'List' },
                { value: 'cards', label: <LayoutGrid size={15} />, aria: 'Cards' },
              ]}
            />
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((c) => (
                <span
                  key={c.key}
                  className="inline-flex h-[26px] items-center gap-0.5 rounded-full border border-[#B5D4F4] bg-[#EBF3FE] pl-2.5 pr-1 text-[12px] font-medium text-[#0C447C]"
                >
                  {c.label}
                  <button
                    type="button"
                    onClick={c.clear}
                    aria-label={`Remove ${c.label}`}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-[#0C447C]/10"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="ml-1 text-[12px] text-slate-500 underline underline-offset-2 transition hover:text-slate-700"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-[12.5px] tabular-nums text-slate-500">
            <span>
              {plural(filtered.length, 'person', 'people')}
              {isFiltered ? (
                <span className="text-slate-400"> of {people.length}</span>
              ) : canFilterStatus && statusIsDefault ? (
                <span className="text-slate-400"> · active only</span>
              ) : null}
            </span>
            <span className="hidden sm:inline">
              {groupBy === 'dept' ? 'Grouped by department' : groupBy === 'manager' ? 'Grouped by manager' : 'Everyone, A–Z'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────── */}
      {/* No top padding on the scroll container itself: sticky headers stick to its padding
          edge, so rows scrolling up would show through a padded strip above them. */}
      <div className="flex-1 overflow-y-auto px-4 pb-5 md:px-10">
        <div className="pt-5">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-[13px] text-slate-500">
              No one matches {search.trim() ? `“${search.trim()}”` : 'these filters'}.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 inline-block text-[12.5px] font-semibold text-[#0C447C] underline underline-offset-2"
            >
              Clear search and filters
            </button>
          </div>
        ) : layout === 'list' ? (
          <div className="rounded-xl border border-slate-200/70 bg-white [overflow:clip]">
            <div className="md:min-w-[780px]" style={{ ['--cols' as string]: cols }}>
              {/* Column headers */}
              <div className="sticky top-0 z-[3] hidden h-[38px] border-b border-slate-200/70 bg-[#F8FAFC] md:grid md:[grid-template-columns:var(--cols)]">
                <HeaderCell label="Name" sortKey="name" sort={sort} onSort={sortBy} />
                {showDept && <HeaderCell label="Department" sortKey="dept" sort={sort} onSort={sortBy} />}
                {showManager && <HeaderCell label="Manager" />}
                <HeaderCell label={statusHeader} />
                <HeaderCell label="Joined" sortKey="joined" sort={sort} onSort={sortBy} />
                <span />
              </div>

              {groups.map((g) => {
                const isClosed = closed.has(g.key);
                return (
                  <div key={g.key}>
                    {groupBy !== 'none' && (
                      <button
                        type="button"
                        onClick={() => setClosed((s) => toggleIn(s, g.key))}
                        aria-expanded={!isClosed}
                        className={cn(
                          'sticky top-0 z-[2] flex h-[42px] w-full items-center gap-2 border-b px-3.5 text-left text-[13px] font-semibold md:top-[38px]',
                          g.key === NO_MANAGER
                            ? 'border-[#FAC775] bg-[#FAEEDA] text-[#854F0B]'
                            : 'border-slate-200/70 bg-[#FBFCFE] text-slate-900 hover:bg-[#F8FAFC]',
                        )}
                      >
                        {isClosed ? <ChevronRight size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
                        {groupTitle(g)}
                      </button>
                    )}
                    {!isClosed && g.rows.map((p) => (
                      <PersonRow
                        key={p.id}
                        person={p}
                        q={search}
                        showDept={showDept}
                        showManager={showManager}
                        showStatus={canFilterStatus}
                        showEvals={pending.size > 0}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.key}>
                {groupBy !== 'none' && (
                  <h2
                    className={cn(
                      'mb-2.5 flex items-center gap-2 px-0.5 text-[13px] font-semibold',
                      g.key === NO_MANAGER ? 'text-[#854F0B]' : 'text-slate-900',
                    )}
                  >
                    {groupTitle(g)}
                  </h2>
                )}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-3">
                  {g.rows.map((p) => <PersonCard key={p.id} person={p} q={search} />)}
                </div>
              </section>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table pieces
// ─────────────────────────────────────────────────────────────────────────────

function HeaderCell({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey?: SortKey;
  sort?: { key: SortKey; dir: 1 | -1 };
  onSort?: (k: SortKey) => void;
}) {
  const base = 'flex items-center px-3.5 text-[11px] font-semibold uppercase tracking-[0.06em]';
  if (!sortKey || !onSort) return <div className={cn(base, 'text-slate-400')}>{label}</div>;
  const on = sort?.key === sortKey;
  const Arrow = sort?.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <div className={base} aria-sort={on ? (sort?.dir === 1 ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 uppercase transition', on ? 'text-slate-800' : 'text-slate-400 hover:text-slate-700')}
      >
        {label}
        {on && <Arrow size={12} />}
      </button>
    </div>
  );
}

function PersonRow({
  person: p,
  q,
  showDept,
  showManager,
  showStatus,
  showEvals = false,
}: {
  person: DirectoryPerson;
  q: string;
  showDept: boolean;
  showManager: boolean;
  showStatus: boolean;
  /** Tag pending review forms (while a review-progress filter is on). */
  showEvals?: boolean;
}) {
  return (
    <div className="group relative flex min-h-[58px] items-center border-b border-slate-100 transition hover:bg-[#FBFCFE] md:grid md:[grid-template-columns:var(--cols)]">
      {/* Name — the link covers the whole row */}
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5">
        <PersonAvatar person={p} size="md" />
        <div className="min-w-0">
          <Link
            href={`/directory/${p.id}`}
            className="block truncate text-[13.5px] font-semibold text-slate-900 outline-none before:absolute before:inset-0 before:content-[''] focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-[#0C447C]"
          >
            <Highlight text={p.name} q={q} />
            {p.isFounder && (
              <span className="ml-1.5 inline-flex rounded-full bg-[#FAEEDA] px-1.5 py-px align-[1px] text-[10.5px] font-semibold text-[#854F0B]">
                Founder
              </span>
            )}
            <span className="md:hidden"><StatusPill status={p.status} /></span>
          </Link>
          <p className="truncate text-[12px] text-slate-500">
            <Highlight text={p.designation} q={q} />
            <span className="md:hidden"> · {deptKey(p)}</span>
          </p>
          {showEvals && (p.evals?.self === 'pending' || p.evals?.manager === 'pending') && (
            <div className="mt-1 flex flex-wrap gap-1">
              {p.evals?.self === 'pending' && (
                <span className="rounded-full bg-[#FAEEDA] px-1.5 py-px text-[10.5px] font-semibold text-[#854F0B]">Self-eval pending</span>
              )}
              {p.evals?.manager === 'pending' && (
                <span className="rounded-full bg-[#FAEEDA] px-1.5 py-px text-[10.5px] font-semibold text-[#854F0B]">Review pending</span>
              )}
            </div>
          )}
        </div>
      </div>

      {showDept && (
        <div className="hidden min-w-0 items-center gap-2 px-3.5 text-[12.5px] text-slate-700 md:flex">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: deptColor(p.department) }} />
          <span className="truncate">{deptKey(p)}</span>
        </div>
      )}

      {showManager && (
        <div className="hidden min-w-0 items-center gap-2 px-3.5 text-[12.5px] text-slate-700 md:flex">
          {p.managerName ? (
            <span className="truncate">{p.managerName}</span>
          ) : p.isFounder ? (
            <span className="text-slate-400">—</span>
          ) : (
            <span className="font-semibold text-[#854F0B]">Not set</span>
          )}
        </div>
      )}

      <div className="hidden min-w-0 items-center gap-2 px-3.5 text-[12.5px] text-slate-700 md:flex">
        {showStatus ? (
          <>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className={cn('h-[7px] w-[7px] rounded-full', STATUS_DOT[p.status])} />
              {STATUS_LABEL[p.status]}
            </span>
            <TypeTag type={p.employmentType} />
          </>
        ) : (
          <span className={p.employmentType === 'full-time' ? 'text-slate-500' : ''}>{TYPE_LABEL[p.employmentType]}</span>
        )}
      </div>

      <div className="hidden items-center px-3.5 text-[12.5px] tabular-nums text-slate-600 md:flex">{p.joinedAt}</div>

      <div className="flex items-center justify-end gap-0.5 pr-2.5 text-slate-300 md:pr-3">
        <CopyButton
          value={p.email}
          className="relative z-[1] hidden h-8 w-8 rounded-md opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 md:inline-flex"
        />
        <ChevronRight size={16} className="transition group-hover:text-[#0C447C]" />
      </div>
    </div>
  );
}

function PersonCard({ person: p, q }: { person: DirectoryPerson; q: string }) {
  return (
    <div className="relative flex min-w-0 flex-col rounded-xl border border-slate-200/70 bg-white p-3.5 transition hover:border-slate-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <div className="mb-2.5 flex items-start justify-between">
        <PersonAvatar person={p} size="lg" />
        <StatusPill status={p.status} />
      </div>
      <Link
        href={`/directory/${p.id}`}
        className="truncate text-[14px] font-semibold text-slate-900 outline-none before:absolute before:inset-0 before:rounded-xl before:content-[''] focus-visible:before:ring-2 focus-visible:before:ring-[#0C447C]"
      >
        <Highlight text={p.name} q={q} />
        {p.isFounder && (
          <span className="ml-1.5 inline-flex rounded-full bg-[#FAEEDA] px-1.5 py-px align-[1px] text-[10.5px] font-semibold text-[#854F0B]">
            Founder
          </span>
        )}
      </Link>
      <p className="truncate text-[12.5px] text-slate-500"><Highlight text={p.designation} q={q} /></p>
      <div className="mb-1 mt-2.5 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 px-2 py-px text-[11.5px] font-medium text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: deptColor(p.department) }} />
          {deptKey(p)}
        </span>
        <TypeTag type={p.employmentType} />
      </div>
      <p className="truncate text-[12px] text-slate-500">
        {p.managerName ? (
          <>Reports to <span className="font-medium text-slate-900">{p.managerName}</span></>
        ) : p.isFounder ? (
          'Top of the org'
        ) : (
          <span className="font-semibold text-[#854F0B]">No manager set</span>
        )}
      </p>
      <div className="mt-2.5 flex items-center gap-1 border-t border-slate-100 pt-2 text-[12px] text-slate-500">
        <span className="min-w-0 flex-1 truncate"><Highlight text={p.email} q={q} /></span>
        <CopyButton value={p.email} className="relative z-[1] h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

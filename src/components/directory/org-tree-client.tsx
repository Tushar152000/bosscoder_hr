'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  Download,
  ListTree,
  Network,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deptColor } from '@/lib/directory/colors';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import styles from './org-tree.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Public types (used by page.tsx)
// ─────────────────────────────────────────────────────────────────────────────

export interface TreeNodeData {
  id: string;
  name: string;
  designation: string;
  department: string;
  initials: string;
  avatarColor: string;
  managerId: string | null;
  role: 'FOUNDER' | 'MANAGER' | 'EMPLOYEE';
  directReportsCount: number;
  totalDownstreamCount: number;
  joinedAt: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type View = 'chart' | 'list';
type Zoom = 'detail' | 'compact' | 'overview';

const NO_DEPT = 'No department';
/** Teams bigger than this (below the top level) stack into a column. */
const STACK_AT = 5;
/** Rows a stacked team shows before "Show N more". */
const STACK_SHOW = 6;
/** Mobile drill-down pseudo-screens. */
const M_TOP = '__top';
const M_UNASSIGNED = '__unassigned';

const deptKey = (n: TreeNodeData) => n.department || NO_DEPT;
const firstName = (n: TreeNodeData) => n.name.split(' ')[0];
/** "1 report" / "3 reports"; pass `many` for irregular plurals ("person" → "people"). */
const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;

interface Model {
  byId: Map<string, TreeNodeData>;
  kids: Map<string, TreeNodeData[]>;
  /** Chart roots: founders, then people with reports but no manager. */
  roots: TreeNodeData[];
  /** Everyone except founders who has no manager set. */
  unassigned: TreeNodeData[];
}

function buildModel(nodes: TreeNodeData[]): Model {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const kids = new Map<string, TreeNodeData[]>();
  for (const n of nodes) {
    if (!n.managerId) continue;
    const list = kids.get(n.managerId) ?? [];
    list.push(n);
    kids.set(n.managerId, list);
  }
  // Managers first, then by name, so sub-teams sit at the top of a stack.
  for (const list of kids.values()) {
    list.sort(
      (a, b) =>
        Number(b.directReportsCount > 0) - Number(a.directReportsCount > 0) ||
        a.name.localeCompare(b.name),
    );
  }
  const founders = nodes.filter(n => n.role === 'FOUNDER' && !n.managerId);
  const unassigned = nodes.filter(n => !n.managerId && n.role !== 'FOUNDER');
  const roots = [...founders, ...unassigned.filter(n => n.directReportsCount > 0)];
  return { byId, kids, roots, unassigned };
}

/** Managers above `id`, nearest first. Guards against loops in the data. */
function ancestorsOf(id: string, byId: Map<string, TreeNodeData>): TreeNodeData[] {
  const out: TreeNodeData[] = [];
  const seen = new Set([id]);
  let cur = byId.get(id);
  while (cur?.managerId && !seen.has(cur.managerId)) {
    seen.add(cur.managerId);
    const m = byId.get(cur.managerId);
    if (!m) break;
    out.push(m);
    cur = m;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small pieces
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({ node, size = 'md', ring }: { node: TreeNodeData; size?: 'sm' | 'md' | 'lg'; ring?: boolean }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold text-white',
        size === 'sm' && 'h-7 w-7 text-[10.5px]',
        size === 'md' && 'h-9 w-9 text-[12px]',
        size === 'lg' && 'h-11 w-11 text-[14px]',
      )}
      style={{
        backgroundColor: node.avatarColor,
        boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 4px ${deptColor(node.department)}` : undefined,
      }}
    >
      {node.initials}
    </span>
  );
}

function RolePill({ node, isRoot }: { node: TreeNodeData; isRoot?: boolean }) {
  if (node.role === 'FOUNDER') {
    return (
      <span className="ml-1.5 inline-flex shrink-0 rounded-full bg-[#FAEEDA] px-1.5 py-px align-[1px] text-[10px] font-semibold text-[#854F0B]">
        Founder
      </span>
    );
  }
  if (isRoot && !node.managerId) {
    return (
      <span className="ml-1.5 inline-flex shrink-0 rounded-full border border-dashed border-[#FAC775] bg-white px-1.5 text-[10px] font-semibold text-[#854F0B]">
        No manager
      </span>
    );
  }
  return null;
}

function PersonDetails({
  node,
  manager,
  onGoTo,
}: {
  node: TreeNodeData;
  manager: TreeNodeData | null;
  onGoTo: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 pr-6">
        <Avatar node={node} size="lg" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight text-slate-900">
            {node.name}
            <RolePill node={node} />
          </p>
          <p className="mt-0.5 text-[12px] text-slate-500">{node.designation}</p>
        </div>
      </div>
      <dl className="mt-3.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px] tabular-nums">
        <dt className="text-slate-500">Department</dt>
        <dd className="flex items-center justify-end gap-1.5 text-right text-slate-900">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: deptColor(node.department) }} />
          {deptKey(node)}
        </dd>
        <dt className="text-slate-500">Direct reports</dt>
        <dd className="text-right text-slate-900">{node.directReportsCount}</dd>
        <dt className="text-slate-500">Total downstream</dt>
        <dd className="text-right text-slate-900">{node.totalDownstreamCount}</dd>
        <dt className="text-slate-500">Reports to</dt>
        <dd className="text-right">
          {manager ? (
            <button
              type="button"
              onClick={() => onGoTo(manager.id)}
              className="rounded-full bg-[#EBF3FE] px-2 py-0.5 text-[12px] font-medium text-[#0C447C] hover:bg-[#dcebfd]"
            >
              {manager.name}
            </button>
          ) : node.role === 'FOUNDER' ? (
            <span className="text-slate-400">—</span>
          ) : (
            <span className="font-medium text-[#854F0B]">Not set</span>
          )}
        </dd>
        <dt className="text-slate-500">Joined</dt>
        <dd className="text-right text-slate-900">{node.joinedAt}</dd>
      </dl>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────────

function SearchBox({
  nodes,
  onPick,
  inputRef,
  autoFocus,
  className,
}: {
  nodes: TreeNodeData[];
  onPick: (id: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [kbd, setKbd] = useState('⌘K');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setKbd('Ctrl K');
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as globalThis.Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const hits = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return [];
    return nodes
      .filter(n =>
        n.name.toLowerCase().includes(s) ||
        n.designation.toLowerCase().includes(s) ||
        n.department.toLowerCase().includes(s),
      )
      .slice(0, 8);
  }, [nodes, q]);

  function pick(id: string) {
    onPick(id);
    setQ('');
    setOpen(false);
    inputRef?.current?.blur();
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <label className="flex h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-slate-400 focus-within:border-[#0C447C] focus-within:ring-2 focus-within:ring-[#0C447C]/15">
        <Search size={14} className="shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          autoFocus={autoFocus}
          onChange={e => { setQ(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); return; }
            if (!hits.length) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setActive(a => (a + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              pick(hits[active].id);
            }
          }}
          placeholder="Search people"
          role="combobox"
          aria-expanded={open && q.trim() !== ''}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
        />
        <kbd className="hidden shrink-0 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1 py-px font-sans text-[10.5px] text-slate-500 md:inline">
          {kbd}
        </kbd>
      </label>
      {open && q.trim() !== '' && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          {hits.length === 0 ? (
            <p className="px-2.5 py-2 text-[12.5px] text-slate-500">No one matches “{q.trim()}”</p>
          ) : (
            hits.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(n.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left',
                  i === active && 'bg-[#EBF3FE]',
                )}
              >
                <Avatar node={n} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-slate-900">{n.name}</span>
                  <span className="block truncate text-[11.5px] text-slate-500">
                    {n.designation} · {deptKey(n)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart view
// ─────────────────────────────────────────────────────────────────────────────

interface ChartCtx {
  model: Model;
  zoom: Zoom;
  expanded: Set<string>;
  showAll: Set<string>;
  selectedId: string | null;
  isDimmed: (n: TreeNodeData) => boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onShowAll: (id: string) => void;
}

function ToggleChip({ node, open, ctx, small }: { node: TreeNodeData; open: boolean; ctx: ChartCtx; small?: boolean }) {
  const count = node.directReportsCount;
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      onClick={() => ctx.onToggle(node.id)}
      aria-expanded={open}
      aria-label={`${open ? 'Close' : 'Open'} ${node.name}'s team (${plural(count, 'report')})`}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full border font-semibold tabular-nums text-[#0C447C] transition',
        open ? 'border-[#B5D4F4] bg-[#EBF3FE]' : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]',
        small ? 'mr-1.5 px-2 py-px text-[11.5px]' : 'px-2.5 py-0.5 text-[12px]',
      )}
    >
      {count}
      {!small && ctx.zoom === 'detail' && <span>&nbsp;{count === 1 ? 'report' : 'reports'}</span>}
      <Icon size={small ? 12 : 13} />
    </button>
  );
}

function NodeCard({ node, isRoot, ctx }: { node: TreeNodeData; isRoot: boolean; ctx: ChartCtx }) {
  const { zoom } = ctx;
  const open = ctx.expanded.has(node.id);
  const selected = ctx.selectedId === node.id;
  const color = deptColor(node.department);
  const sub = node.role === 'FOUNDER'
    ? `${node.designation} · ${node.totalDownstreamCount} people`
    : node.designation || deptKey(node);

  if (zoom === 'overview') {
    return (
      <div className={cn('flex flex-col items-center', ctx.isDimmed(node) && 'opacity-30')}>
        <button
          type="button"
          data-node-id={node.id}
          onClick={() => ctx.onSelect(node.id)}
          title={`${node.name} · ${node.designation}`}
          className={cn('rounded-full p-[3px] transition', selected && 'ring-4 ring-[#0C447C]/20')}
          style={{ border: `2.5px solid ${color}` }}
        >
          <Avatar node={node} />
        </button>
        <span className="mt-1 whitespace-nowrap text-[11.5px] text-slate-500">{firstName(node)}</span>
        {node.directReportsCount > 0 && (
          <span className="mt-1"><ToggleChip node={node} open={open} ctx={ctx} /></span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center', ctx.isDimmed(node) && 'opacity-30')}>
      <button
        type="button"
        data-node-id={node.id}
        onClick={() => ctx.onSelect(node.id)}
        title={`${node.name} · ${node.designation}`}
        className={cn(
          'relative flex items-center overflow-hidden rounded-[10px] border bg-white text-left transition',
          zoom === 'detail' ? 'gap-2.5 py-2.5 pl-4 pr-3' : 'gap-2 py-2 pl-3.5 pr-2.5',
          zoom === 'detail' ? (isRoot ? 'w-[248px]' : 'w-[212px]') : isRoot ? 'w-[190px]' : 'w-[160px]',
          selected
            ? 'border-[#0C447C] shadow-[0_0_0_3px_rgba(12,68,124,0.14)]'
            : 'border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-slate-300',
        )}
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
        <Avatar node={node} size={zoom === 'detail' ? 'md' : 'sm'} />
        <span className="min-w-0">
          <span className={cn('block truncate font-semibold leading-tight text-slate-900', zoom === 'detail' ? 'text-[13.5px]' : 'text-[12.5px]')}>
            {node.name}
            <RolePill node={node} isRoot={isRoot} />
          </span>
          {zoom === 'detail' && <span className="mt-0.5 block truncate text-[12px] text-slate-500">{sub}</span>}
        </span>
      </button>
      {node.directReportsCount > 0 && (
        <span className="relative z-[1] -mt-3"><ToggleChip node={node} open={open} ctx={ctx} /></span>
      )}
    </div>
  );
}

function StackRows({ list, ctx }: { list: TreeNodeData[]; ctx: ChartCtx }) {
  const overview = ctx.zoom === 'overview';
  return (
    <>
      {list.map(n => {
        const open = ctx.expanded.has(n.id);
        const kids = ctx.model.kids.get(n.id) ?? [];
        return (
          <div key={n.id} className={cn(overview && 'contents')}>
            <div
              className={cn(
                'flex items-center rounded-lg',
                !overview && (ctx.selectedId === n.id ? 'bg-[#EBF3FE]' : 'hover:bg-[#F8FAFC]'),
                ctx.isDimmed(n) && 'opacity-30',
              )}
            >
              <button
                type="button"
                data-node-id={n.id}
                onClick={() => ctx.onSelect(n.id)}
                title={`${n.name} · ${n.designation}`}
                className={cn('flex min-w-0 flex-1 items-center gap-2.5 text-left', overview ? 'p-0.5' : 'px-2 py-1.5')}
              >
                <Avatar node={n} size="sm" ring={overview} />
                {!overview && (
                  <span className="min-w-0">
                    <span className={cn('block truncate text-[13px] font-medium', ctx.selectedId === n.id ? 'text-[#0C447C]' : 'text-slate-900')}>
                      {n.name}
                    </span>
                    {ctx.zoom === 'detail' && (
                      <span className="block truncate text-[12px] text-slate-500">{n.designation}</span>
                    )}
                  </span>
                )}
              </button>
              {!overview && kids.length > 0 && <ToggleChip node={n} open={open} ctx={ctx} small />}
            </div>
            {(open || overview) && kids.length > 0 && (
              <div className={cn(overview ? 'contents' : 'my-0.5 ml-[22px] border-l-[1.5px] border-[#BFCBD9] pl-1')}>
                <StackRows list={kids} ctx={ctx} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function Branch({ node, depth, ctx }: { node: TreeNodeData; depth: number; ctx: ChartCtx }) {
  const kids = ctx.model.kids.get(node.id) ?? [];
  const open = ctx.expanded.has(node.id) && kids.length > 0;
  const stacked = depth >= 1 && kids.length > STACK_AT;
  const overview = ctx.zoom === 'overview';
  const all = ctx.showAll.has(node.id) || overview;
  const visible = all ? kids : kids.slice(0, STACK_SHOW);

  return (
    <li>
      <NodeCard node={node} isRoot={depth === 0} ctx={ctx} />
      {open && stacked && (
        <div className={styles.stackwrap}>
          <div
            className={cn(
              'rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
              overview ? 'flex max-w-[184px] flex-wrap gap-1.5 p-2' : ctx.zoom === 'detail' ? 'w-[260px]' : 'w-[200px]',
            )}
          >
            <p className={cn('flex items-center gap-1.5 text-[12px] font-medium text-slate-400', overview ? 'w-full' : 'px-2 pb-1.5 pt-1')}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: deptColor(node.department) }} />
              {overview ? `${firstName(node)}'s team · ${kids.length}` : `Reports to ${firstName(node)} · ${kids.length}`}
            </p>
            <StackRows list={visible} ctx={ctx} />
            {!all && (
              <button
                type="button"
                onClick={() => ctx.onShowAll(node.id)}
                className="px-2 pb-1 pt-1.5 text-[12.5px] font-semibold text-[#0C447C] hover:underline"
              >
                Show {kids.length - STACK_SHOW} more
              </button>
            )}
          </div>
        </div>
      )}
      {open && !stacked && (
        <ul>
          {kids.map(k => <Branch key={k.id} node={k} depth={depth + 1} ctx={ctx} />)}
        </ul>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List view: a table with tree lines
// ─────────────────────────────────────────────────────────────────────────────

type ListGroup = 'line' | 'dept';

/** Shared by every row in the list. */
interface ListCtx {
  model: Model;
  group: ListGroup;
  open: Set<string>;
  selectedId: string | null;
  matches: (n: TreeNodeData) => boolean;
  /** True when the node or someone below it passes the department filter. */
  isShown: (n: TreeNodeData) => boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onGoTo: (id: string) => void;
  onShowInChart: (id: string) => void;
}

/** Column template: name, title, department, reports, team size / reports to, joined. */
const LIST_COLS = 'md:[grid-template-columns:minmax(290px,2.4fr)_minmax(150px,1.5fr)_minmax(140px,1.1fr)_84px_minmax(104px,0.9fr)_96px]';

function Guides({ lines, own }: { lines: boolean[]; own?: 'tee' | 'last' | 'down' | 'blank' }) {
  return (
    <>
      {lines.map((on, i) => <span key={i} className={cn(styles.g, on && styles.gv)} />)}
      {own && (
        <span
          className={cn(
            styles.g,
            own === 'tee' && styles.gt,
            own === 'last' && styles.gl,
            own === 'down' && styles.gv,
          )}
        />
      )}
    </>
  );
}

function TableRow({
  node,
  lines,
  last,
  depth,
  ctx,
  unassigned,
}: {
  node: TreeNodeData;
  lines: boolean[];
  last: boolean;
  depth: number;
  ctx: ListCtx;
  unassigned?: boolean;
}) {
  const line = ctx.group === 'line';
  const kids = ctx.model.kids.get(node.id) ?? [];
  const visibleKids = kids.filter(ctx.isShown);
  const open = line && ctx.open.has(node.id) && visibleKids.length > 0;
  const selected = ctx.selectedId === node.id;
  const faded = !ctx.matches(node);
  const manager = node.managerId ? ctx.model.byId.get(node.managerId) ?? null : null;
  const childLines = depth > 0 ? [...lines, !last] : [];
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <>
      <div
        onClick={e => { e.stopPropagation(); ctx.onSelect(node.id); }}
        className={cn(
          'flex min-h-[50px] cursor-pointer items-stretch border-b border-slate-100 md:grid',
          LIST_COLS,
          selected ? 'bg-[#EBF3FE]' : 'hover:bg-[#FBFCFE]',
        )}
      >
        {/* Name, with tree lines */}
        <div className="flex min-w-0 flex-1 items-stretch px-2">
          {line && depth > 0 && <Guides lines={lines} own={last ? 'last' : 'tee'} />}
          {line && (kids.length > 0 ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); ctx.onToggle(node.id); }}
              aria-expanded={open}
              aria-label={`${open ? 'Close' : 'Open'} ${node.name}'s team`}
              className="grid h-6 w-6 shrink-0 place-items-center self-center rounded-md text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
            >
              <Chevron size={14} />
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          ))}
          <button
            type="button"
            data-node-id={node.id}
            onClick={e => { e.stopPropagation(); ctx.onSelect(node.id); }}
            className={cn('flex min-w-0 items-center gap-2.5 py-2 pl-1 text-left', faded && 'opacity-45')}
          >
            <Avatar node={node} size="sm" />
            <span className="min-w-0">
              <span className={cn('block truncate text-[13px] font-medium', selected ? 'text-[#0C447C]' : 'text-slate-900')}>
                {node.name}
                <RolePill node={node} isRoot={depth === 0 && line} />
              </span>
              <span className="block truncate text-[12px] text-slate-500 md:hidden">
                {node.designation ? `${node.designation} · ` : ''}{deptKey(node)}
              </span>
            </span>
          </button>
        </div>

        <div className={cn('hidden min-w-0 items-center px-3 text-[12.5px] text-slate-700 md:flex', faded && 'opacity-45')}>
          <span className="truncate">{node.designation || '—'}</span>
        </div>
        <div className={cn('hidden min-w-0 items-center gap-2 px-3 text-[12.5px] text-slate-700 md:flex', faded && 'opacity-45')}>
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: deptColor(node.department) }} />
          <span className="truncate">{deptKey(node)}</span>
        </div>
        <div className={cn('flex shrink-0 items-center justify-end px-3', faded && 'opacity-45')}>
          {kids.length === 0 ? (
            <span className="hidden text-[12.5px] text-slate-400 md:inline">—</span>
          ) : line ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); ctx.onToggle(node.id); }}
              aria-label={`${plural(kids.length, 'direct report')}, ${open ? 'close' : 'open'} team`}
              className={cn(
                'h-6 min-w-[32px] rounded-full border px-2.5 text-[12px] font-semibold tabular-nums text-[#0C447C] transition',
                open ? 'border-[#B5D4F4] bg-[#EBF3FE]' : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]',
              )}
            >
              {kids.length}
            </button>
          ) : (
            <span className="text-[12.5px] font-semibold tabular-nums text-slate-900">{kids.length}</span>
          )}
        </div>
        <div className={cn('hidden min-w-0 items-center px-3 text-[12.5px] md:flex', line && 'justify-end', faded && 'opacity-45')}>
          {line ? (
            node.totalDownstreamCount ? <span className="tabular-nums text-slate-700">{node.totalDownstreamCount}</span> : <span className="text-slate-400">—</span>
          ) : manager ? (
            <span className="truncate text-slate-700">{manager.name}</span>
          ) : node.role === 'FOUNDER' ? (
            <span className="text-slate-400">—</span>
          ) : (
            <span className="font-semibold text-[#854F0B]">Not set</span>
          )}
        </div>
        <div className={cn('hidden items-center px-3 text-[12.5px] tabular-nums text-slate-600 md:flex', faded && 'opacity-45')}>
          {unassigned ? (
            <Link
              href={`/directory/${node.id}/edit`}
              onClick={e => e.stopPropagation()}
              className="whitespace-nowrap rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[12px] font-semibold text-[#0C447C] hover:bg-[#F8FAFC]"
            >
              Set manager
            </Link>
          ) : (
            node.joinedAt
          )}
        </div>
      </div>

      {selected && (
        <div onClick={e => e.stopPropagation()} className="flex border-b border-[#E2E8F0] bg-[#EBF3FE] pl-2">
          {line && <Guides lines={childLines} own={open ? 'down' : 'blank'} />}
          <div className="mb-3 ml-1.5 mr-3.5 flex min-w-0 flex-1 flex-wrap items-center gap-x-7 gap-y-3 rounded-[10px] border border-[#B5D4F4] bg-white px-3.5 py-3">
            <dl className="flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
              <div>
                <dt className="text-[11.5px] text-slate-500">Reports to</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {manager ? (
                    <button
                      type="button"
                      onClick={() => ctx.onGoTo(manager.id)}
                      className="rounded-full bg-[#EBF3FE] px-2 py-0.5 text-[12px] font-medium text-[#0C447C] hover:bg-[#dcebfd]"
                    >
                      {manager.name}
                    </button>
                  ) : node.role === 'FOUNDER' ? '—' : <span className="text-[#854F0B]">Not set</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-slate-500">Department</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-900">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: deptColor(node.department) }} />
                  {deptKey(node)}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-slate-500">Team size</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-slate-900">{plural(node.totalDownstreamCount, 'person', 'people')}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] text-slate-500">Joined</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-slate-900">{node.joinedAt}</dd>
              </div>
            </dl>
            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              <Link
                href={`/directory/${node.id}`}
                className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[#0C447C] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0A3A6A] sm:flex-none"
              >
                View profile
              </Link>
              <button
                type="button"
                onClick={() => ctx.onShowInChart(node.id)}
                className="hidden h-9 rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[13px] font-semibold text-slate-900 transition hover:bg-[#F8FAFC] md:block"
              >
                Show in chart
              </button>
              {!node.managerId && node.role !== 'FOUNDER' && (
                <Link
                  href={`/directory/${node.id}/edit`}
                  className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[#FAC775] bg-[#FAEEDA] px-3.5 text-[13px] font-semibold text-[#854F0B] sm:flex-none"
                >
                  Set manager
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {open && visibleKids.map((k, i) => (
        <TableRow
          key={k.id}
          node={k}
          lines={childLines}
          last={i === visibleKids.length - 1}
          depth={depth + 1}
          ctx={ctx}
        />
      ))}
    </>
  );
}

function TreeTable({
  ctx,
  nodes,
  deptClosed,
  onToggleDept,
  onOpenAll,
  onCloseAll,
  onGroup,
}: {
  ctx: ListCtx;
  nodes: TreeNodeData[];
  deptClosed: Set<string>;
  onToggleDept: (d: string) => void;
  onOpenAll: () => void;
  onCloseAll: () => void;
  onGroup: (g: ListGroup) => void;
}) {
  const { model, group } = ctx;
  const line = group === 'line';
  const shownCount = nodes.filter(ctx.matches).length;
  const filtered = shownCount !== nodes.length;

  const deptGroups = useMemo(() => {
    const m = new Map<string, TreeNodeData[]>();
    for (const n of nodes) {
      if (!ctx.matches(n)) continue;
      const list = m.get(deptKey(n)) ?? [];
      list.push(n);
      m.set(deptKey(n), list);
    }
    return [...m.entries()]
      .map(([name, rows]) => ({
        name,
        rows: rows.sort((a, b) => b.totalDownstreamCount - a.totalDownstreamCount || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => Number(a.name === NO_DEPT) - Number(b.name === NO_DEPT) || b.rows.length - a.rows.length);
  }, [nodes, ctx]);

  const roots = model.roots.filter(ctx.isShown);
  const soloUnassigned = model.unassigned.filter(n => n.directReportsCount === 0 && ctx.matches(n));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 md:p-3.5">
        <div className="flex h-8 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white" role="group" aria-label="Group the list">
          {([['line', 'Reporting line'], ['dept', 'By department']] as const).map(([g, label]) => (
            <button
              key={g}
              type="button"
              onClick={() => onGroup(g)}
              aria-pressed={group === g}
              className={cn(
                'px-3 text-[12.5px] font-medium transition',
                group === g ? 'bg-[#EBF3FE] text-[#0C447C]' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12.5px] tabular-nums text-slate-500">
            {filtered ? `Showing ${shownCount} of ${nodes.length} people` : plural(nodes.length, 'person', 'people')}
          </span>
          <button type="button" onClick={onOpenAll} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[12.5px] font-medium text-slate-500 hover:bg-[#F8FAFC] hover:text-slate-800">
            <ChevronsUpDown size={14} /> Open all
          </button>
          <button type="button" onClick={onCloseAll} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[12.5px] font-medium text-slate-500 hover:bg-[#F8FAFC] hover:text-slate-800">
            <ChevronsDownUp size={14} /> Close all
          </button>
        </div>
      </div>

      <div className="mx-2 mb-3 rounded-[10px] border border-[#E2E8F0] bg-white [overflow:clip] md:mx-3.5 md:mb-3.5 md:min-w-[880px]">
        <div className={cn('sticky top-0 z-[2] hidden h-9 border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 md:grid', LIST_COLS)}>
          <span className="flex items-center px-3.5">Name</span>
          <span className="flex items-center px-3">Title</span>
          <span className="flex items-center px-3">Department</span>
          <span className="flex items-center justify-end px-3">Reports</span>
          <span className={cn('flex items-center px-3', line && 'justify-end')}>{line ? 'Team size' : 'Reports to'}</span>
          <span className="flex items-center px-3">Joined</span>
        </div>

        {line ? (
          <>
            {roots.map(r => <TableRow key={r.id} node={r} lines={[]} last depth={0} ctx={ctx} />)}
            {soloUnassigned.length > 0 && (
              <>
                <div className="flex h-11 items-center gap-2 border-y border-[#FAC775] bg-[#FAEEDA] px-3.5 text-[13px] font-semibold text-[#854F0B]">
                  <AlertTriangle size={15} className="shrink-0" />
                  No manager set
                  <span className="font-medium tabular-nums opacity-70">{soloUnassigned.length}</span>
                  <span className="ml-auto hidden truncate text-[12px] font-normal sm:inline">Pick a manager so they appear in the tree</span>
                </div>
                {soloUnassigned.map(n => <TableRow key={n.id} node={n} lines={[]} last depth={0} ctx={ctx} unassigned />)}
              </>
            )}
          </>
        ) : (
          deptGroups.map(g => {
            const isClosed = deptClosed.has(g.name);
            const lead = g.rows.find(n => n.directReportsCount > 0);
            return (
              <div key={g.name}>
                <button
                  type="button"
                  onClick={() => onToggleDept(g.name)}
                  aria-expanded={!isClosed}
                  className="flex h-11 w-full items-center gap-2 border-b border-[#E2E8F0] bg-[#FBFCFE] px-3.5 text-left text-[13px] font-semibold text-slate-900 hover:bg-[#F8FAFC]"
                >
                  {isClosed ? <ChevronRight size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
                  <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ backgroundColor: deptColor(g.name === NO_DEPT ? '' : g.name) }} />
                  <span className="truncate">{g.name}</span>
                  <span className="font-medium tabular-nums text-slate-400">{g.rows.length}</span>
                  {lead && <span className="ml-auto hidden truncate text-[12px] font-normal text-slate-500 sm:inline">Led by {lead.name}</span>}
                </button>
                {!isClosed && g.rows.map(n => (
                  <TableRow
                    key={n.id}
                    node={n}
                    lines={[]}
                    last
                    depth={0}
                    ctx={ctx}
                    unassigned={!n.managerId && n.role !== 'FOUNDER'}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile: one team at a time
// ─────────────────────────────────────────────────────────────────────────────

function MobileTeams({
  model,
  at,
  setAt,
  selectedId,
  isDimmed,
  onSelect,
}: {
  model: Model;
  at: string;
  setAt: (id: string) => void;
  selectedId: string | null;
  isDimmed: (n: TreeNodeData) => boolean;
  onSelect: (id: string) => void;
}) {
  const multiRoot = model.roots.length !== 1;
  const home = multiRoot ? M_TOP : model.roots[0].id;
  const manager = at === M_TOP || at === M_UNASSIGNED ? null : model.byId.get(at) ?? null;
  const rows = at === M_TOP ? model.roots : at === M_UNASSIGNED ? model.unassigned : model.kids.get(at) ?? [];
  const chain = manager ? ancestorsOf(manager.id, model.byId).reverse() : [];
  const showWarn = model.unassigned.length > 0 && (at === M_TOP || (manager?.role === 'FOUNDER' && !manager.managerId));

  return (
    <div>
      <nav className="mb-2.5 flex flex-wrap items-center gap-1 text-[12.5px] text-slate-500" aria-label="Team path">
        {(multiRoot || at === M_UNASSIGNED) && at !== M_TOP && (
          <>
            <button type="button" onClick={() => setAt(home)} className="font-medium text-[#0C447C]">
              {multiRoot ? 'Top' : model.roots[0].name}
            </button>
            <ChevronRight size={13} />
          </>
        )}
        {chain.map(c => (
          <span key={c.id} className="contents">
            <button type="button" onClick={() => setAt(c.id)} className="font-medium text-[#0C447C]">{c.name}</button>
            <ChevronRight size={13} />
          </span>
        ))}
        <span className="font-medium text-slate-900">
          {at === M_TOP ? 'Top of the org' : at === M_UNASSIGNED ? 'No manager set' : manager?.name}
        </span>
      </nav>

      {manager && (
        <button
          type="button"
          onClick={() => onSelect(manager.id)}
          className="relative flex w-full items-center gap-3 overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white py-3.5 pl-[18px] pr-3.5 text-left"
        >
          <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: deptColor(manager.department) }} />
          <Avatar node={manager} size="lg" />
          <span className="min-w-0">
            <span className="block text-[16px] font-semibold text-slate-900">
              {manager.name}
              <RolePill node={manager} isRoot />
            </span>
            <span className="block text-[12.5px] text-slate-500">
              {manager.designation} · {plural(manager.directReportsCount, 'report')} · {manager.totalDownstreamCount} total
            </span>
          </span>
        </button>
      )}

      <p className="mx-1 mb-1.5 mt-4 text-[12px] font-semibold text-slate-400">
        {at === M_TOP ? 'Top of the org' : at === M_UNASSIGNED ? 'People with no manager' : 'Direct reports'} · {rows.length}
      </p>
      <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-1">
        {rows.map(n => (
          <div
            key={n.id}
            className={cn('flex items-center rounded-[10px]', selectedId === n.id && 'bg-[#EBF3FE]', isDimmed(n) && 'opacity-30')}
          >
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2.5 text-left"
            >
              <Avatar node={n} size="sm" />
              <span className="min-w-0">
                <span className={cn('block truncate text-[14px] font-medium', selectedId === n.id ? 'text-[#0C447C]' : 'text-slate-900')}>
                  {n.name}
                </span>
                <span className="block truncate text-[12px] text-slate-500">{n.designation || deptKey(n)}</span>
              </span>
            </button>
            {n.directReportsCount > 0 && (
              <button
                type="button"
                onClick={() => setAt(n.id)}
                aria-label={`Open ${n.name}'s team`}
                className="mr-1.5 inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-[12.5px] font-semibold tabular-nums text-[#0C447C]"
              >
                {n.directReportsCount}
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {showWarn && (
        <button
          type="button"
          onClick={() => setAt(M_UNASSIGNED)}
          className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#FAC775] bg-[#FAEEDA] px-3 py-2.5 text-left text-[13px] font-semibold text-[#854F0B]"
        >
          <AlertTriangle size={15} className="shrink-0" />
          {model.unassigned.length === 1 ? '1 person has' : `${model.unassigned.length} people have`} no manager
          <ChevronRight size={15} className="ml-auto" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgTreeClient — main export
// ─────────────────────────────────────────────────────────────────────────────

export function OrgTreeClient({ nodes }: { nodes: TreeNodeData[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const model = useMemo(() => buildModel(nodes), [nodes]);
  const kidsOf = useCallback((id: string) => model.kids.get(id) ?? [], [model]);
  const depthOf = useCallback((id: string) => ancestorsOf(id, model.byId).length, [model]);

  const [view, setViewState] = useState<View>(() => (searchParams.get('view') === 'list' ? 'list' : 'chart'));
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const f = searchParams.get('focus');
    return f && model.byId.has(f) ? f : null;
  });
  const [activeDepts, setActiveDepts] = useState<Set<string>>(() => {
    const d = searchParams.get('dept');
    return d ? new Set(d.split(',').filter(Boolean)) : new Set();
  });
  const [zoom, setZoom] = useState<Zoom>('detail');
  // Chart opens on the top two levels: roots plus their direct reports.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(model.roots.map(r => r.id)));
  const [showAll, setShowAll] = useState<Set<string>>(() => new Set());
  // List view opens the first two levels.
  const [listOpen, setListOpen] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const r of model.roots) {
      s.add(r.id);
      for (const k of model.kids.get(r.id) ?? []) s.add(k.id);
    }
    return s;
  });
  const [listGroup, setListGroup] = useState<ListGroup>('line');
  const [deptClosed, setDeptClosed] = useState<Set<string>>(() => new Set());
  const [trayOpen, setTrayOpen] = useState(false);
  const [chipsAll, setChipsAll] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [mobileAt, setMobileAt] = useState<string>(() => (model.roots.length === 1 ? model.roots[0].id : M_TOP));
  const [pendingCenter, setPendingCenter] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── stats + department chips ──
  const totalManagers = useMemo(() => nodes.filter(n => n.directReportsCount > 0).length, [nodes]);
  const departments = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) m.set(deptKey(n), (m.get(deptKey(n)) ?? 0) + 1);
    return [...m.entries()]
      .map(([name, count]) => ({ name, count, color: deptColor(name === NO_DEPT ? '' : name) }))
      .sort((a, b) => Number(a.name === NO_DEPT) - Number(b.name === NO_DEPT) || b.count - a.count);
  }, [nodes]);
  const totalDepts = departments.filter(d => d.name !== NO_DEPT).length;

  const isDimmed = useCallback(
    (n: TreeNodeData) => activeDepts.size > 0 && !activeDepts.has(deptKey(n)),
    [activeDepts],
  );

  // List view hides people outside the department filter, but keeps the
  // managers above a match so the reporting line still reads.
  const shownIds = useMemo(() => {
    if (!activeDepts.size) return null;
    const s = new Set<string>();
    for (const n of nodes) {
      if (!activeDepts.has(deptKey(n))) continue;
      s.add(n.id);
      for (const a of ancestorsOf(n.id, model.byId)) s.add(a.id);
    }
    return s;
  }, [activeDepts, nodes, model]);

  // ── URL sync (view, selected person, departments) ──
  const syncUrl = useCallback(
    (next: { view?: View; focus?: string | null; dept?: Set<string> }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next.view !== undefined) { if (next.view === 'chart') p.delete('view'); else p.set('view', next.view); }
      if (next.focus !== undefined) { if (next.focus) p.set('focus', next.focus); else p.delete('focus'); }
      if (next.dept !== undefined) { if (next.dept.size) p.set('dept', [...next.dept].join(',')); else p.delete('dept'); }
      const qs = p.toString();
      // Update the address bar without re-running the server page.
      window.history.replaceState(null, '', `${pathname}${qs ? `?${qs}` : ''}`);
    },
    [pathname, searchParams],
  );

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    syncUrl({ focus: id });
  }, [syncUrl]);

  /** Open every team between the top and `id`, so its card is on screen. */
  const reveal = useCallback((id: string) => {
    const chain = ancestorsOf(id, model.byId);
    setExpanded(prev => { const s = new Set(prev); chain.forEach(a => s.add(a.id)); return s; });
    setListOpen(prev => { const s = new Set(prev); chain.forEach(a => s.add(a.id)); return s; });
    setShowAll(prev => {
      const s = new Set(prev);
      let child = id;
      for (const a of chain) {
        const kids = kidsOf(a.id);
        if (depthOf(a.id) >= 1 && kids.length > STACK_AT && kids.findIndex(k => k.id === child) >= STACK_SHOW) s.add(a.id);
        child = a.id;
      }
      return s;
    });
    const self = model.byId.get(id);
    if (self) setDeptClosed(prev => { const s = new Set(prev); s.delete(deptKey(self)); return s; });
    const top = chain.length ? chain[chain.length - 1] : self;
    if (top && !model.roots.some(r => r.id === top.id)) setTrayOpen(true);
    const node = model.byId.get(id);
    if (node) setMobileAt(node.managerId ?? (model.roots.some(r => r.id === id) ? id : M_UNASSIGNED));
  }, [model, kidsOf, depthOf]);

  const goTo = useCallback((id: string) => {
    reveal(id);
    select(id);
    setPendingCenter(id);
  }, [reveal, select]);

  // ── centring + popover placement ──
  const centerOn = useCallback((id: string, smooth = true) => {
    const scroller = scrollerRef.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`);
    if (!scroller || !el) return;
    const r = el.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({
      left: view === 'list' ? scroller.scrollLeft : scroller.scrollLeft + r.left - s.left - (s.width - r.width) / 2,
      top: scroller.scrollTop + r.top - s.top - Math.min(160, (s.height - r.height) / 2),
      behavior: smooth && !reduce ? 'smooth' : 'auto',
    });
  }, [view]);

  const placePop = useCallback(() => {
    const pop = popRef.current;
    const canvas = canvasRef.current;
    if (!pop || !canvas || !selectedId || view !== 'chart') return;
    const anchor = canvas.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(selectedId)}"]`);
    if (!anchor || !anchor.offsetParent) { pop.style.visibility = 'hidden'; return; }
    const r = anchor.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const offscreen = r.bottom < c.top || r.top > c.bottom || r.right < c.left || r.left > c.right;
    if (offscreen) { pop.style.visibility = 'hidden'; return; }
    let x = r.right - c.left + 14;
    if (x + w > c.width - 10) x = r.left - c.left - 14 - w;
    if (x < 10) x = Math.max(10, (c.width - w) / 2);
    const y = Math.max(10, Math.min(r.top - c.top - 10, c.height - h - 10));
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    pop.style.visibility = 'visible';
  }, [selectedId, view]);

  useLayoutEffect(() => { placePop(); });

  useEffect(() => {
    const scroller = scrollerRef.current;
    let raf = 0;
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(placePop); };
    scroller?.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      cancelAnimationFrame(raf);
      scroller?.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
    };
  }, [placePop, view]);

  useEffect(() => {
    if (!pendingCenter) return;
    centerOn(pendingCenter);
    setPendingCenter(null);
  }, [pendingCenter, centerOn]);

  // Open on the founder, or on the person in ?focus=.
  useEffect(() => {
    if (selectedId) {
      reveal(selectedId);
      setPendingCenter(selectedId);
    } else if (model.roots[0]) {
      requestAnimationFrame(() => centerOn(model.roots[0].id, false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⌘K / Ctrl K focuses search; Esc clears the selection.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.matchMedia('(min-width: 768px)').matches) searchInputRef.current?.focus();
        else setMobileSearch(true);
      } else if (e.key === 'Escape' && selectedId && !(e.target instanceof HTMLInputElement)) {
        select(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, select]);

  // ── drag to pan (mouse only; touch and trackpads scroll natively) ──
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    const s = scrollerRef.current!;
    drag.current = { x: e.clientX, y: e.clientY, left: s.scrollLeft, top: s.scrollTop, moved: false };
    s.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    d.moved = true;
    const s = scrollerRef.current!;
    s.scrollLeft = d.left - dx;
    s.scrollTop = d.top - dy;
  }
  function onPointerUp() {
    suppressClick.current = !!drag.current?.moved;
    drag.current = null;
  }
  function onCanvasClick(e: React.MouseEvent) {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (!(e.target as HTMLElement).closest('button, a') && selectedId) select(null);
  }

  // ── actions ──
  function setView(v: View) {
    setViewState(v);
    syncUrl({ view: v });
    if (v === 'chart') setPendingCenter(selectedId ?? model.roots[0]?.id ?? null);
    else scrollerRef.current?.scrollTo(0, 0);
  }

  function toggleExpanded(id: string) {
    const opening = !expanded.has(id);
    setExpanded(prev => { const s = new Set(prev); if (opening) s.add(id); else s.delete(id); return s; });
    if (opening) setPendingCenter(id);
  }

  function toggleListOpen(id: string) {
    setListOpen(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  function setDepts(next: Set<string>) {
    setActiveDepts(next);
    syncUrl({ dept: next });
    if (next.size) {
      setListOpen(prev => {
        const s = new Set(prev);
        for (const n of nodes) {
          if (next.has(deptKey(n))) ancestorsOf(n.id, model.byId).forEach(a => s.add(a.id));
        }
        return s;
      });
    }
  }

  function openAll() {
    const ids = nodes.filter(n => n.directReportsCount > 0).map(n => n.id);
    setExpanded(new Set(ids));
    setShowAll(new Set(ids));
  }

  function closeAll() {
    setExpanded(new Set(model.roots.map(r => r.id)));
    setShowAll(new Set());
    setPendingCenter(model.roots[0]?.id ?? null);
  }

  function exportCsv() {
    const rows = [
      ['Employee ID', 'Name', 'Designation', 'Department', 'Manager', 'Direct Reports', 'Total Downstream', 'Joined'],
      ...nodes.map(n => [
        n.id, n.name, n.designation, n.department,
        n.managerId ? (model.byId.get(n.managerId)?.name ?? n.managerId) : '',
        String(n.directReportsCount),
        String(n.totalDownstreamCount),
        n.joinedAt,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'org-tree.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const selected = selectedId ? model.byId.get(selectedId) ?? null : null;
  const selectedManager = selected?.managerId ? model.byId.get(selected.managerId) ?? null : null;
  const unassignedCount = model.unassigned.length;

  const ctx: ChartCtx = {
    model,
    zoom,
    expanded,
    showAll,
    selectedId,
    isDimmed,
    onToggle: toggleExpanded,
    onSelect: id => select(selectedId === id ? null : id),
    onShowAll: id => setShowAll(prev => new Set(prev).add(id)),
  };

  const listCtx: ListCtx = {
    model,
    group: listGroup,
    open: listOpen,
    selectedId,
    matches: n => !isDimmed(n),
    isShown: n => !shownIds || shownIds.has(n.id),
    onToggle: toggleListOpen,
    onSelect: id => select(selectedId === id ? null : id),
    onGoTo: goTo,
    onShowInChart: id => { setView('chart'); goTo(id); },
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Directory', href: '/directory' }, { label: 'Org tree' }]} className="mb-1.5" />

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] font-medium text-slate-900 md:text-[22px]">Org tree</h1>
          <p className="mt-0.5 text-[12.5px] tabular-nums text-slate-500">
            {nodes.length} people · {totalManagers} managers · {totalDepts} departments
            {unassignedCount > 0 && (
              <>
                {' · '}
                <span className="font-medium text-[#854F0B]">{unassignedCount} without a manager</span>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <SearchBox nodes={nodes} onPick={goTo} inputRef={searchInputRef} className="hidden w-[240px] md:block" />
          <button
            type="button"
            onClick={() => setMobileSearch(o => !o)}
            aria-label="Search people"
            aria-pressed={mobileSearch}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#E2E8F0] bg-white text-slate-500 md:hidden"
          >
            <Search size={16} />
          </button>
          <div className="flex h-9 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white" role="group" aria-label="View">
            {([
              { mode: 'chart' as const, Icon: Network, label: 'Chart' },
              { mode: 'list' as const, Icon: ListTree, label: 'List' },
            ]).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                aria-label={label}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 text-[12.5px] font-medium transition md:px-3',
                  view === mode ? 'bg-[#EBF3FE] text-[#0C447C]' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            aria-label="Export CSV"
            title="Download everyone as a CSV"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[12.5px] font-medium text-slate-700 transition hover:bg-[#F8FAFC] md:px-3"
          >
            <Download size={15} />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {mobileSearch && (
        <SearchBox
          nodes={nodes}
          onPick={id => { goTo(id); setMobileSearch(false); }}
          autoFocus
          className="mb-3 md:hidden"
        />
      )}

      {/* Department chips */}
      <div
        role="group"
        aria-label="Filter by department"
        className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
      >
        <button
          type="button"
          onClick={() => setDepts(new Set())}
          aria-pressed={activeDepts.size === 0}
          className={cn(
            'inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12.5px] font-medium transition',
            activeDepts.size === 0
              ? 'border-[#0C447C] bg-[#0C447C] text-white'
              : 'border-[#E2E8F0] bg-white text-slate-700 hover:border-slate-300',
          )}
        >
          All departments
        </button>
        {departments.map((d, i) => {
          const on = activeDepts.has(d.name);
          // Phones scroll the whole row; desktop shows six until "+N more".
          const collapsed = !chipsAll && i >= 6 && !on;
          return (
            <button
              key={d.name}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = new Set(activeDepts);
                if (on) next.delete(d.name); else next.add(d.name);
                setDepts(next);
              }}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition',
                collapsed && 'md:hidden',
                on
                  ? 'border-[#B5D4F4] bg-[#EBF3FE] text-[#0C447C]'
                  : 'border-[#E2E8F0] bg-white text-slate-700 hover:border-slate-300',
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
              <span className="tabular-nums text-slate-400">{d.count}</span>
            </button>
          );
        })}
        {departments.length > 6 && (
          <button
            type="button"
            onClick={() => setChipsAll(o => !o)}
            className="hidden h-8 shrink-0 items-center rounded-full border border-[#E2E8F0] bg-white px-3 text-[12.5px] font-medium text-slate-500 hover:border-slate-300 md:inline-flex"
          >
            {chipsAll ? 'Show fewer' : `+${departments.length - 6} more`}
          </button>
        )}
      </div>

      {/* Mobile: one team at a time */}
      {view === 'chart' && model.roots.length > 0 && (
        <div className="md:hidden">
          <MobileTeams
            model={model}
            at={mobileAt}
            setAt={id => { setMobileAt(id); select(null); }}
            selectedId={selectedId}
            isDimmed={isDimmed}
            onSelect={id => select(selectedId === id ? null : id)}
          />
        </div>
      )}

      {/* Canvas: chart (desktop) or list (all sizes) */}
      <div
        ref={canvasRef}
        className={cn(
          'relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
          view === 'chart' ? 'hidden h-[620px] md:block lg:h-[700px]' : 'h-[70vh] md:h-[620px] lg:h-[700px]',
        )}
      >
        <div
          ref={scrollerRef}
          onPointerDown={view === 'chart' ? onPointerDown : undefined}
          onPointerMove={view === 'chart' ? onPointerMove : undefined}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onCanvasClick}
          className={cn('absolute inset-0 overflow-auto', view === 'chart' && cn(styles.dots, 'cursor-grab active:cursor-grabbing'))}
        >
          {view === 'chart' ? (
            <div className="flex w-max min-w-full justify-center gap-12 px-14 pb-40 pt-[76px]">
              {model.roots.length === 0 ? (
                <p className="text-[13px] text-slate-500">No reporting lines are set up yet.</p>
              ) : (
                model.roots.map(root => (
                  <div key={root.id} className={cn(styles.tree, zoom === 'overview' && styles.tight)}>
                    <ul>
                      <Branch node={root} depth={0} ctx={ctx} />
                    </ul>
                  </div>
                ))
              )}
            </div>
          ) : (
            <TreeTable
              ctx={listCtx}
              nodes={nodes}
              deptClosed={deptClosed}
              onToggleDept={d => setDeptClosed(prev => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n; })}
              onGroup={setListGroup}
              onOpenAll={() => {
                setListOpen(new Set(nodes.filter(n => n.directReportsCount > 0).map(n => n.id)));
                setDeptClosed(new Set());
              }}
              onCloseAll={() => {
                setListOpen(new Set(model.roots.map(r => r.id)));
                setDeptClosed(new Set(nodes.map(deptKey)));
              }}
            />
          )}
        </div>

        {view === 'chart' && (
          <>
            {/* Zoom levels */}
            <div className="absolute left-3.5 top-3.5 z-10 flex overflow-hidden rounded-full border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]" role="group" aria-label="Zoom level">
              {(['detail', 'compact', 'overview'] as const).map(z => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  aria-pressed={zoom === z}
                  className={cn(
                    'h-8 px-3 text-[12.5px] font-medium capitalize transition',
                    zoom === z ? 'bg-[#EBF3FE] text-[#0C447C]' : 'text-slate-500 hover:bg-[#F8FAFC]',
                  )}
                >
                  {z}
                </button>
              ))}
            </div>

            {/* Open / close all */}
            <div className="absolute right-3.5 top-3.5 z-10 flex overflow-hidden rounded-full border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <button type="button" onClick={openAll} className="inline-flex h-8 items-center gap-1 px-3 text-[12.5px] font-medium text-slate-500 hover:bg-[#F8FAFC]">
                <ChevronsUpDown size={14} /> Open all
              </button>
              <button type="button" onClick={closeAll} className="inline-flex h-8 items-center gap-1 border-l border-[#E2E8F0] px-3 text-[12.5px] font-medium text-slate-500 hover:bg-[#F8FAFC]">
                <ChevronsDownUp size={14} /> Close all
              </button>
            </div>

            {/* People with no manager */}
            {unassignedCount > 0 && (
              <div className="absolute bottom-3.5 right-3.5 z-[15] w-[310px] max-w-[calc(100%-28px)] rounded-xl border border-dashed border-[#FAC775] bg-[#FAEEDA] text-[#854F0B]">
                <button
                  type="button"
                  onClick={() => setTrayOpen(o => !o)}
                  aria-expanded={trayOpen}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold"
                >
                  <AlertTriangle size={15} className="shrink-0" />
                  {unassignedCount === 1 ? '1 person has' : `${unassignedCount} people have`} no manager
                  <span className="ml-auto flex">
                    {model.unassigned.slice(0, 3).map(n => (
                      <span
                        key={n.id}
                        className="-ml-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[#FAEEDA] text-[9px] font-semibold text-white"
                        style={{ backgroundColor: n.avatarColor }}
                      >
                        {n.initials}
                      </span>
                    ))}
                  </span>
                  {trayOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {trayOpen && (
                  <div className="max-h-[300px] overflow-y-auto rounded-b-[11px] border-t border-dashed border-[#FAC775] bg-white p-1.5 text-slate-900">
                    {model.unassigned.map(n => (
                      <div key={n.id} className={cn('flex items-center gap-1.5 rounded-lg', selectedId === n.id ? 'bg-[#EBF3FE]' : 'hover:bg-[#F8FAFC]')}>
                        <button
                          type="button"
                          data-node-id={n.id}
                          onClick={() => select(selectedId === n.id ? null : n.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 p-1.5 text-left"
                        >
                          <Avatar node={n} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium">{n.name}</span>
                            <span className="block truncate text-[12px] text-slate-500">{n.designation || deptKey(n)}</span>
                          </span>
                        </button>
                        <Link
                          href={`/directory/${n.id}/edit`}
                          className="mr-1.5 shrink-0 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[12px] font-semibold text-[#0C447C] hover:bg-[#F8FAFC]"
                        >
                          Set manager
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Details beside the selected person (desktop chart) */}
        {selected && view === 'chart' && (
          <div
            ref={popRef}
            role="dialog"
            aria-label={`${selected.name} details`}
            style={{ visibility: 'hidden', left: 0, top: 0 }}
            className="absolute z-30 hidden w-[284px] rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.06)] md:block"
          >
            <button
              type="button"
              onClick={() => select(null)}
              aria-label="Close"
              className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-[#F8FAFC] hover:text-slate-700"
            >
              <X size={15} />
            </button>
            <PersonDetails node={selected} manager={selectedManager} onGoTo={goTo} />
            <div className="mt-3.5 flex gap-2">
              <Link
                href={`/directory/${selected.id}`}
                className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[#0C447C] text-[13px] font-semibold text-white transition hover:bg-[#0A3A6A]"
              >
                View profile
              </Link>
              {view === 'chart' && (
                <button
                  type="button"
                  onClick={() => centerOn(selected.id)}
                  title="Centre on chart"
                  aria-label="Centre on chart"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#E2E8F0] text-slate-500 transition hover:bg-[#F8FAFC]"
                >
                  <Crosshair size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Details as a bottom sheet (phone chart; the list shows them inline) */}
      {selected && view === 'chart' && (
        <div className="md:hidden">
          <button type="button" aria-label="Close details" onClick={() => select(null)} className="fixed inset-0 z-40 bg-slate-900/20" />
          <div
            role="dialog"
            aria-label={`${selected.name} details`}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[22px] border-t border-[#E2E8F0] bg-white px-[18px] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.12)]"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E2E8F0]" />
            <button
              type="button"
              onClick={() => select(null)}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-slate-400"
            >
              <X size={16} />
            </button>
            <PersonDetails node={selected} manager={selectedManager} onGoTo={goTo} />
            <div className="mt-4 flex gap-2">
              <Link
                href={`/directory/${selected.id}`}
                className="flex h-11 flex-1 items-center justify-center rounded-lg bg-[#0C447C] text-[13.5px] font-semibold text-white"
              >
                View profile
              </Link>
              {selected.directReportsCount > 0 && view === 'chart' && (
                <button
                  type="button"
                  onClick={() => { setMobileAt(selected.id); select(null); }}
                  className="h-11 flex-1 rounded-lg border border-[#E2E8F0] text-[13.5px] font-semibold text-slate-900"
                >
                  Open team
                </button>
              )}
              {!selected.managerId && selected.role !== 'FOUNDER' && (
                <Link
                  href={`/directory/${selected.id}/edit`}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg border border-[#FAC775] bg-[#FAEEDA] text-[13.5px] font-semibold text-[#854F0B]"
                >
                  Set manager
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

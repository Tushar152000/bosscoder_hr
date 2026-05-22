'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useReactFlow,
  type Node as RFNode,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import {
  Home,
  ChevronRight,
  Search,
  Share2,
  ListTree,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  MousePointerClick,
  Crosshair,
  Users,
  User,
  Check,
  ChevronDown,
  ChevronRight as ChevronRightSm,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const DEPT_COLORS: Record<string, string> = {
  engineering: '#3B82F6',
  tech: '#3B82F6',
  growth: '#10B981',
  sales: '#8B5CF6',
  operations: '#F97316',
  ops: '#F97316',
  hr: '#EC4899',
  marketing: '#F59E0B',
  product: '#06B6D4',
  design: '#F43F5E',
};

function deptColor(dept: string): string {
  return DEPT_COLORS[dept.toLowerCase().replace(/\s+/g, '')] ?? '#94A3B8';
}

function buildChildrenMap(nodes: TreeNodeData[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.managerId) {
      const list = m.get(n.managerId) ?? [];
      list.push(n.id);
      m.set(n.managerId, list);
    }
  }
  return m;
}

function getDescendants(id: string, cm: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const queue: string[] = [...(cm.get(id) ?? [])];
  while (queue.length) {
    const cur = queue.pop()!;
    result.add(cur);
    for (const c of cm.get(cur) ?? []) queue.push(c);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dagre layout
// ─────────────────────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 68;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyLayout(nodes: RFNode<any>[], edges: Edge[]): RFNode<any>[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 28 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return nodes.map(n => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgNode — custom React Flow node
// ─────────────────────────────────────────────────────────────────────────────

interface OrgNodeInternalData extends Record<string, unknown> {
  tree: TreeNodeData;
  selected: boolean;
  dimmed: boolean;
  collapsed: boolean;
  collapsible: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function OrgNode({ data }: NodeProps) {
  const { tree, selected, dimmed, collapsed, collapsible, onSelect, onToggle } =
    data as OrgNodeInternalData;
  return (
    <div style={{ width: NODE_W, opacity: dimmed ? 0.35 : 1 }} className="relative">
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0, background: 'transparent', opacity: 0 }}
      />

      <div
        onClick={() => onSelect(tree.id)}
        className={cn(
          'w-full rounded-md border bg-white px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-all',
          selected
            ? 'border-[#0C447C] shadow-[0_2px_8px_rgba(12,68,124,0.12)]'
            : tree.directReportsCount > 0
            ? 'border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
            : 'border-[#E2E8F0] shadow-[0_1px_2px_rgba(12,68,124,0.04)]',
        )}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0"
          style={{ backgroundColor: tree.avatarColor }}
        >
          {tree.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[12px] font-medium text-slate-900 leading-tight max-w-[116px] truncate">
              {tree.name}
            </span>
            {tree.role === 'FOUNDER' && (
              <span className="inline-flex items-center text-[8px] font-medium text-[#854F0B] bg-[#FAEEDA] px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                Founder
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">
            {tree.directReportsCount > 0
              ? `${tree.designation} · ${tree.directReportsCount} reports`
              : `${tree.designation} · ${tree.department}`}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0, background: 'transparent', opacity: 0 }}
      />

      {collapsible && (
        <button
          onClick={e => {
            e.stopPropagation();
            onToggle(tree.id);
          }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 text-[10px] text-slate-500 bg-[#F8FAFC] border border-dashed border-[#E2E8F0] px-2 py-0.5 rounded-[5px] whitespace-nowrap z-10 hover:bg-white transition"
        >
          {collapsed ? (
            <><ChevronRightSm className="w-2.5 h-2.5" />{tree.directReportsCount} reports</>
          ) : (
            <><ChevronDown className="w-2.5 h-2.5" />{tree.directReportsCount} reports</>
          )}
        </button>
      )}
    </div>
  );
}

// stable reference — must be outside component
const nodeTypes = { org: OrgNode } as const;

// ─────────────────────────────────────────────────────────────────────────────
// OrgChartInner (needs to be inside ReactFlowProvider for useReactFlow)
// ─────────────────────────────────────────────────────────────────────────────

interface ChartInnerProps {
  treeNodes: TreeNodeData[];
  childrenMap: Map<string, string[]>;
  selectedId: string | null;
  activeDepts: Set<string>;
  onSelect: (id: string) => void;
  focusId: string | null;
  orphans: TreeNodeData[];
}

function OrgChartInner({
  treeNodes, childrenMap, selectedId, activeDepts, onSelect, focusId, orphans,
}: ChartInnerProps) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  const initialCollapsed = useMemo(() => {
    const roots = new Set(treeNodes.filter(n => !n.managerId).map(n => n.id));
    const rootChildren = new Set<string>();
    for (const rid of roots) {
      for (const cid of childrenMap.get(rid) ?? []) rootChildren.add(cid);
    }
    const s = new Set<string>();
    for (const n of treeNodes) {
      if (roots.has(n.id) || rootChildren.has(n.id)) continue;
      if (n.totalDownstreamCount > 8) s.add(n.id);
    }
    return s;
  }, [treeNodes, childrenMap]);

  const [collapsed, setCollapsed] = useState<Set<string>>(initialCollapsed);

  const onToggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const hiddenIds = useMemo(() => {
    const s = new Set<string>();
    for (const cid of collapsed) {
      for (const did of getDescendants(cid, childrenMap)) s.add(did);
    }
    return s;
  }, [collapsed, childrenMap]);

  const { rfNodes, rfEdges } = useMemo(() => {
    const visible = treeNodes.filter(n => !hiddenIds.has(n.id));
    const visibleSet = new Set(visible.map(n => n.id));

    const rawNodes: RFNode<OrgNodeInternalData>[] = visible.map(n => ({
      id: n.id,
      type: 'org' as const,
      position: { x: 0, y: 0 },
      data: {
        tree: n,
        selected: n.id === selectedId,
        dimmed: activeDepts.size > 0 && !activeDepts.has(n.department),
        collapsed: collapsed.has(n.id),
        collapsible: n.directReportsCount > 4,
        onSelect,
        onToggle,
      },
    }));

    const rawEdges: Edge[] = [];
    for (const n of visible) {
      if (n.managerId && visibleSet.has(n.managerId)) {
        rawEdges.push({
          id: `${n.managerId}->${n.id}`,
          source: n.managerId,
          target: n.id,
          type: 'smoothstep',
          style: { stroke: '#DBE3EC', strokeWidth: 1 },
        });
      }
    }

    return { rfNodes: applyLayout(rawNodes, rawEdges), rfEdges: rawEdges };
  }, [treeNodes, hiddenIds, selectedId, activeDepts, collapsed, onSelect, onToggle]);

  // Focus a node when focusId changes
  useEffect(() => {
    if (!focusId) return;
    const node = rfNodes.find(n => n.id === focusId);
    if (node) {
      setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, {
        zoom: 1,
        duration: 400,
      });
    }
  }, [focusId, rfNodes, setCenter]);

  return (
    <>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        panOnScroll
        zoomOnScroll
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#DBE3EC" />
      </ReactFlow>

      {/* Zoom controls */}
      <div className="absolute top-2.5 right-2.5 flex gap-0.5 p-0.5 bg-white border border-[#E2E8F0] rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.06)] z-10">
        {[
          { Icon: ZoomIn, action: () => zoomIn({ duration: 200 }), label: 'Zoom in' },
          { Icon: ZoomOut, action: () => zoomOut({ duration: 200 }), label: 'Zoom out' },
          { Icon: Maximize2, action: () => fitView({ duration: 400, padding: 0.15 }), label: 'Fit view' },
        ].map(({ Icon, action, label }) => (
          <button
            key={label}
            onClick={action}
            title={label}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] text-slate-500 hover:bg-[#F8FAFC] transition"
          >
            <Icon size={13} />
          </button>
        ))}
      </div>

      {/* Orphan banner */}
      {orphans.length > 0 && (
        <Link
          href="/directory?filter=orphans"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 bg-[#FAEEDA] border border-dashed border-[#FAC775] rounded-md px-3 py-2"
        >
          <AlertCircle size={12} className="text-[#854F0B] shrink-0" />
          <span className="text-[11px] font-medium text-[#854F0B] whitespace-nowrap">
            {orphans.length} employee{orphans.length !== 1 ? 's' : ''} have no manager set — fix in Directory
          </span>
        </Link>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgChart wrapper
// ─────────────────────────────────────────────────────────────────────────────

function OrgChart(props: ChartInnerProps) {
  return (
    <div className="relative w-full h-[480px] md:h-[600px] lg:h-[680px] rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <ReactFlowProvider>
        <OrgChartInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgListView
// ─────────────────────────────────────────────────────────────────────────────

interface ListRowProps {
  node: TreeNodeData;
  depth: number;
  children: TreeNodeData[];
  childrenMap: Map<string, string[]>;
  allNodes: Map<string, TreeNodeData>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeDepts: Set<string>;
}

function ListRow({ node, depth, children, childrenMap, allNodes, selectedId, onSelect, activeDepts }: ListRowProps) {
  const [open, setOpen] = useState(depth < 2);
  const dimmed = activeDepts.size > 0 && !activeDepts.has(node.department);
  const isSelected = node.id === selectedId;

  return (
    <div className={cn('relative', depth > 0 && 'ml-7')}>
      {depth > 0 && (
        <>
          <span className="absolute left-[-21px] top-0 h-full w-px bg-slate-200/70" />
          <span className="absolute left-[-21px] top-5 w-4 h-px bg-slate-200/70" />
        </>
      )}
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors',
          isSelected ? 'bg-[#EBF3FE]' : 'hover:bg-slate-50',
          dimmed && 'opacity-40',
        )}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium shrink-0"
          style={{ backgroundColor: node.avatarColor }}
        >
          {node.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-[12px] font-medium truncate', isSelected ? 'text-[#0C447C]' : 'text-slate-900')}>
              {node.name}
            </span>
            {node.role === 'FOUNDER' && (
              <span className="text-[8px] font-medium text-[#854F0B] bg-[#FAEEDA] px-1.5 py-0.5 rounded-full shrink-0">
                Founder
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 truncate">{node.designation} · {node.department}</p>
        </div>
        {children.length > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 transition"
          >
            {open ? <ChevronDown size={12} /> : <ChevronRightSm size={12} />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
      </div>

      {open && children.map(child => (
        <ListRow
          key={child.id}
          node={child}
          depth={depth + 1}
          children={(childrenMap.get(child.id) ?? []).map(id => allNodes.get(id)!).filter(Boolean)}
          childrenMap={childrenMap}
          allNodes={allNodes}
          selectedId={selectedId}
          onSelect={onSelect}
          activeDepts={activeDepts}
        />
      ))}
    </div>
  );
}

interface OrgListViewProps {
  treeNodes: TreeNodeData[];
  childrenMap: Map<string, string[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeDepts: Set<string>;
  roots: TreeNodeData[];
  orphans: TreeNodeData[];
}

function OrgListView({ treeNodes, childrenMap, selectedId, onSelect, activeDepts, roots, orphans }: OrgListViewProps) {
  const allNodes = useMemo(() => new Map(treeNodes.map(n => [n.id, n])), [treeNodes]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3">
      {roots.map(root => (
        <ListRow
          key={root.id}
          node={root}
          depth={0}
          children={(childrenMap.get(root.id) ?? []).map(id => allNodes.get(id)!).filter(Boolean)}
          childrenMap={childrenMap}
          allNodes={allNodes}
          selectedId={selectedId}
          onSelect={onSelect}
          activeDepts={activeDepts}
        />
      ))}
      {orphans.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
          <p className="text-[10px] font-medium tracking-[1px] text-slate-400 mb-2">UNASSIGNED</p>
          {orphans.map(n => (
            <ListRow
              key={n.id}
              node={n}
              depth={0}
              children={[]}
              childrenMap={childrenMap}
              allNodes={allNodes}
              selectedId={selectedId}
              onSelect={onSelect}
              activeDepts={activeDepts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgSidebar
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  selected: TreeNodeData | null;
  allNodes: Map<string, TreeNodeData>;
  byDepartment: Array<{ name: string; count: number; color: string }>;
  activeDepts: Set<string>;
  onToggleDept: (dept: string) => void;
  onFocusNode: (id: string) => void;
}

function OrgSidebar({ selected, allNodes, byDepartment, activeDepts, onToggleDept, onFocusNode }: SidebarProps) {
  const manager = selected?.managerId ? allNodes.get(selected.managerId) : null;

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-4">

      {/* Panel 1 — Selected */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-[10px] font-medium tracking-[1px] text-slate-400 mb-2.5">SELECTED</p>
        {!selected ? (
          <div className="flex flex-col items-center gap-1.5 py-4 text-center">
            <MousePointerClick size={20} className="text-slate-300" />
            <p className="text-[12px] text-slate-500">Click any node to see details</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-medium shrink-0"
                style={{ backgroundColor: selected.avatarColor }}
              >
                {selected.initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{selected.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{selected.designation}</p>
              </div>
            </div>
            <div className="border-t border-[#E2E8F0] pt-2.5 flex flex-col gap-1.5">
              <SidebarRow label="Department" value={selected.department} />
              <SidebarRow label="Direct reports" value={String(selected.directReportsCount)} />
              <SidebarRow label="Total downstream" value={String(selected.totalDownstreamCount)} />
              {manager && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Reports to</span>
                  <button
                    onClick={() => onFocusNode(manager.id)}
                    className="flex items-center gap-1 text-[10px] font-medium text-[#0C447C] hover:underline"
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-medium shrink-0"
                      style={{ backgroundColor: manager.avatarColor }}
                    >
                      {manager.initials.slice(0, 1)}
                    </span>
                    {manager.name}
                  </button>
                </div>
              )}
              <SidebarRow label="Joined" value={selected.joinedAt} />
            </div>
            <div className="mt-3 flex gap-1.5">
              <Link
                href={`/directory/${selected.id}`}
                className="flex-1 flex items-center justify-center h-8 rounded-lg bg-[#0C447C] text-white text-[12px] font-medium hover:bg-[#0a3a6a] transition"
              >
                View profile
              </Link>
              <button
                onClick={() => onFocusNode(selected.id)}
                title="Center on chart"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-slate-500 hover:bg-[#F8FAFC] transition"
              >
                <Crosshair size={13} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Panel 2 — Dept filter */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-[10px] font-medium tracking-[1px] text-slate-400 mb-2.5">FILTER BY DEPARTMENT</p>
        <div className="flex flex-col gap-1.5">
          {byDepartment.map(({ name, count, color }) => {
            const active = activeDepts.size === 0 || activeDepts.has(name);
            return (
              <label key={name} className="flex items-center gap-1.5 cursor-pointer" onClick={() => onToggleDept(name)}>
                <span
                  className={cn(
                    'w-3 h-3 rounded-sm flex items-center justify-center shrink-0 transition',
                    active ? 'bg-[#0C447C]' : 'border border-[#E2E8F0] bg-white',
                  )}
                >
                  {active && <Check size={8} className="text-white" strokeWidth={3} />}
                </span>
                <span className="flex items-center gap-1.5 flex-1 text-[11px] text-slate-900">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  {name}
                </span>
                <span className="text-[10px] text-slate-400">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Panel 3 — Legend */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-[10px] font-medium tracking-[1px] text-slate-400 mb-2.5">LEGEND</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex text-[8px] font-medium text-[#854F0B] bg-[#FAEEDA] px-1.5 py-0.5 rounded-full shrink-0">
              Founder
            </span>
            <span className="text-[10px] text-slate-500">Top of tree</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={12} className="text-[#0C447C] shrink-0" />
            <span className="text-[10px] text-slate-500">Has direct reports</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={12} className="text-slate-400 shrink-0" />
            <span className="text-[10px] text-slate-500">Individual contributor</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[10px] font-medium text-slate-900">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgTreeClient — main export
// ─────────────────────────────────────────────────────────────────────────────

interface OrgTreeClientProps {
  nodes: TreeNodeData[];
  totalPeople: number;
  totalManagers: number;
  totalDepts: number;
  maxDepth: number;
  orphans: TreeNodeData[];
}

export function OrgTreeClient({
  nodes,
  totalPeople,
  totalManagers,
  totalDepts,
  maxDepth,
  orphans,
}: OrgTreeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [view, setViewState] = useState<'chart' | 'list'>(() => {
    const v = searchParams.get('view');
    return v === 'list' ? 'list' : 'chart';
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('focus'));
  const [activeDepts, setActiveDepts] = useState<Set<string>>(() => {
    const d = searchParams.get('dept');
    return d ? new Set(d.split(',').filter(Boolean)) : new Set();
  });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const allNodesMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const roots = useMemo(() => nodes.filter(n => !n.managerId && n.directReportsCount > 0), [nodes]);
  const byDepartment = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) if (n.department) m.set(n.department, (m.get(n.department) ?? 0) + 1);
    return [...m.entries()]
      .map(([name, count]) => ({ name, count, color: deptColor(name) }))
      .sort((a, b) => b.count - a.count);
  }, [nodes]);

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return nodes
      .filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.designation.toLowerCase().includes(q) ||
        n.department.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [nodes, search]);

  const pushUrl = useCallback(
    (next: { view?: 'chart' | 'list'; focus?: string | null; dept?: Set<string> }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next.view !== undefined) {
        if (next.view === 'chart') p.delete('view'); else p.set('view', next.view);
      }
      if (next.focus !== undefined) {
        if (!next.focus) p.delete('focus'); else p.set('focus', next.focus);
      }
      if (next.dept !== undefined) {
        if (next.dept.size === 0) p.delete('dept'); else p.set('dept', [...next.dept].join(','));
      }
      const qs = p.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  function setView(v: 'chart' | 'list') {
    setViewState(v);
    pushUrl({ view: v });
  }

  function handleSelect(id: string) {
    const next = id === selectedId ? null : id;
    setSelectedId(next);
    pushUrl({ focus: next });
  }

  function handleFocusNode(id: string) {
    setSelectedId(id);
    setFocusId(id);
    setTimeout(() => setFocusId(null), 600);
    pushUrl({ focus: id });
    if (view !== 'chart') setView('chart');
  }

  function handleToggleDept(dept: string) {
    setActiveDepts(prev => {
      let next: Set<string>;
      if (prev.size === 0) {
        // start from all-active; deselect just this dept
        next = new Set(byDepartment.map(d => d.name).filter(d => d !== dept));
      } else {
        next = new Set(prev);
        if (next.has(dept)) {
          next.delete(dept);
          if (next.size === byDepartment.length) next = new Set(); // all = empty
        } else {
          next.add(dept);
          if (next.size === byDepartment.length) next = new Set();
        }
      }
      pushUrl({ dept: next });
      return next;
    });
  }

  function exportCsv() {
    const rows = [
      ['Employee ID', 'Name', 'Designation', 'Department', 'Manager', 'Direct Reports', 'Total Downstream', 'Joined'],
      ...nodes.map(n => [
        n.id, n.name, n.designation, n.department,
        n.managerId ? (allNodesMap.get(n.managerId)?.name ?? n.managerId) : '',
        String(n.directReportsCount),
        String(n.totalDownstreamCount),
        n.joinedAt,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'org-tree.csv';
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const t = e.target as globalThis.Node;
      if (searchRef.current && !searchRef.current.contains(t)) setShowSearchDrop(false);
      if (exportRef.current && !exportRef.current.contains(t)) setShowExport(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const selectedNode = selectedId ? (allNodesMap.get(selectedId) ?? null) : null;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[14px] text-slate-400 mb-1.5">
        <Link href="/" className="flex items-center gap-1 hover:text-slate-600 transition">
          <Home size={11} />
          Home
        </Link>
        <ChevronRight size={10} />
        <Link href="/directory" className="hover:text-slate-600 transition">Directory</Link>
        <ChevronRight size={10} />
        <span className="text-slate-600 font-semibold">Org tree</span>
      </nav>

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-medium text-slate-900">Org tree</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            {totalPeople} people · {totalManagers} managers · {totalDepts} departments · max depth {maxDepth}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <div className="flex items-center gap-1.5 w-[200px] bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5">
              <Search size={12} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSearchDrop(true); }}
                onFocus={() => setShowSearchDrop(true)}
                placeholder="Search people…"
                className="flex-1 min-w-0 bg-transparent text-[11px] text-slate-900 placeholder:text-slate-400 outline-none"
              />
              <kbd className="font-mono text-[9px] text-slate-400 bg-[#F8FAFC] border border-[#E2E8F0] px-1 py-0.5 rounded shrink-0">⌘K</kbd>
            </div>
            {showSearchDrop && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 w-full bg-white border border-[#E2E8F0] rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
                {searchResults.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      handleFocusNode(n.id);
                      setSearch('');
                      setShowSearchDrop(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-[#F8FAFC] transition text-left"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium shrink-0"
                      style={{ backgroundColor: n.avatarColor }}
                    >
                      {n.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-900 truncate">{n.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{n.designation}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex p-0.5 bg-white border border-[#E2E8F0] rounded-md">
            {([
              { mode: 'chart' as const, Icon: Share2, label: 'Chart' },
              { mode: 'list' as const, Icon: ListTree, label: 'List' },
            ]).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-[11px] transition',
                  view === mode
                    ? 'bg-[#EBF3FE] text-[#0C447C] font-medium'
                    : 'bg-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Export */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setShowExport(o => !o)}
              className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-[11px] text-slate-700 hover:bg-[#F8FAFC] transition"
            >
              <Download size={12} />
              Export
            </button>
            {showExport && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-[#E2E8F0] rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 overflow-hidden min-w-[148px]">
                <button
                  onClick={exportCsv}
                  className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-[#F8FAFC] transition"
                >
                  Export as CSV
                </button>
                <div className="px-3 py-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  Export as PNG
                  <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded">Soon</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        <div>
          {view === 'chart' ? (
            <OrgChart
              treeNodes={nodes}
              childrenMap={childrenMap}
              selectedId={selectedId}
              activeDepts={activeDepts}
              onSelect={handleSelect}
              focusId={focusId}
              orphans={orphans}
            />
          ) : (
            <OrgListView
              treeNodes={nodes}
              childrenMap={childrenMap}
              selectedId={selectedId}
              onSelect={handleSelect}
              activeDepts={activeDepts}
              roots={roots}
              orphans={orphans}
            />
          )}
        </div>

        <OrgSidebar
          selected={selectedNode}
          allNodes={allNodesMap}
          byDepartment={byDepartment}
          activeDepts={activeDepts}
          onToggleDept={handleToggleDept}
          onFocusNode={handleFocusNode}
        />
      </div>
    </div>
  );
}
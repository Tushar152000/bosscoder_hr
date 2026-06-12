'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { OrgNode } from './OrgNode';
import { OrgEdges } from './OrgEdges';
import { NODE_W, NODE_H, deptColor, DEPT_COLORS } from './types';
import type { OrgPerson, OrgTreeNode } from './types';

// ─── Layout constants ──────────────────────────────────────────────────────────
const H_GAP     = 20;
const CANVAS_PAD = 80;
const Y_OFFSETS = [40, 220, 420];

function getY(level: number): number {
  if (level <= Y_OFFSETS.length) return Y_OFFSETS[level - 1];
  return Y_OFFSETS[Y_OFFSETS.length - 1] + (level - Y_OFFSETS.length) * 210;
}

function subtreeWidth(node: OrgTreeNode): number {
  if (node.children.length === 0) return NODE_W + H_GAP;
  return node.children.reduce((s, c) => s + subtreeWidth(c), 0);
}

function assignPositions(node: OrgTreeNode, startX: number, level: number): void {
  node.level = level;
  node.y     = getY(level);
  const w    = subtreeWidth(node);
  node.x     = startX + w / 2 - NODE_W / 2;
  let cx     = startX;
  for (const child of node.children) {
    assignPositions(child, cx, level + 1);
    cx += subtreeWidth(child);
  }
}

function layoutTree(root: OrgTreeNode): OrgTreeNode {
  assignPositions(root, 0, 1);
  const all  = flatNodes(root);
  const minX = Math.min(...all.map((n) => n.x));
  all.forEach((n) => { n.x += CANVAS_PAD - minX; });
  return root;
}

function flatNodes(node: OrgTreeNode): OrgTreeNode[] {
  const out: OrgTreeNode[] = [node];
  for (const c of node.children) out.push(...flatNodes(c));
  return out;
}

function buildTree(people: OrgPerson[]): OrgTreeNode | null {
  if (!people.length) return null;
  const map = new Map<string, OrgTreeNode>();
  for (const p of people) {
    map.set(p.id, { ...p, children: [], x: 0, y: 0, level: 0 });
  }
  const roots: OrgTreeNode[] = [];
  for (const node of map.values()) {
    if (!node.managerId || !map.has(node.managerId)) {
      roots.push(node);
    } else {
      map.get(node.managerId)!.children.push(node);
    }
  }
  function sortTree(n: OrgTreeNode) {
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    n.children.forEach(sortTree);
  }
  if (roots.length === 1) { sortTree(roots[0]); return roots[0]; }
  if (roots.length === 0) return null;
  // multiple roots → virtual root (not rendered as a card)
  const vRoot: OrgTreeNode = {
    id: '__root__', name: 'Organisation', role: '', department: 'HR',
    managerId: null, children: roots, x: 0, y: 0, level: 0,
  };
  roots.forEach(sortTree);
  return vRoot;
}

// ─── Animation ─────────────────────────────────────────────────────────────────
type TF = { scale: number; tx: number; ty: number };

function runAnim(from: TF, to: TF, onFrame: (t: TF) => void): () => void {
  let raf: number;
  let t0: number | null = null;
  const dur = 300;
  const ease = (t: number) => 1 - (1 - t) ** 3;
  function frame(now: number) {
    if (!t0) t0 = now;
    const t = Math.min((now - t0) / dur, 1);
    const e = ease(t);
    onFrame({
      scale: from.scale + (to.scale - from.scale) * e,
      tx:    from.tx    + (to.tx    - from.tx)    * e,
      ty:    from.ty    + (to.ty    - from.ty)    * e,
    });
    if (t < 1) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// ─── Ordered dept list ─────────────────────────────────────────────────────────
const KNOWN_ORDER = Object.keys(DEPT_COLORS);

// ─── Component ─────────────────────────────────────────────────────────────────
export function OrgChart({ people }: { people: OrgPerson[] }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const stopAnim = useRef<(() => void) | null>(null);

  const [root,      setRoot]      = useState<OrgTreeNode | null>(null);
  const [allNodes,  setAllNodes]  = useState<OrgTreeNode[]>([]);
  const [transform, setTransform] = useState<TF>({ scale: 1, tx: 0, ty: 0 });
  const tfRef = useRef<TF>({ scale: 1, tx: 0, ty: 0 });

  const [activeDept, setActiveDept] = useState('all');
  const [search,     setSearch]     = useState('');
  const dragRef = useRef<{ ox: number; oy: number; otx: number; oty: number } | null>(null);
  const isDragging = useRef(false);

  // keep ref in sync
  useEffect(() => { tfRef.current = transform; }, [transform]);

  // build + layout
  useEffect(() => {
    const tree = buildTree(people);
    if (!tree) return;
    layoutTree(tree);
    const nodes = flatNodes(tree);
    setRoot(tree);
    setAllNodes(nodes);
  }, [people]);

  // canvas dimensions
  const canvasW = useMemo(
    () => (allNodes.length ? Math.max(...allNodes.map((n) => n.x + NODE_W)) + CANVAS_PAD : 800),
    [allNodes],
  );
  const canvasH = useMemo(
    () => (allNodes.length ? Math.max(...allNodes.map((n) => n.y + NODE_H)) + CANVAS_PAD : 600),
    [allNodes],
  );

  // fit-all initial view
  const fitView = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !canvasW || !canvasH) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const scale = Math.min((vw * 0.92) / canvasW, (vh * 0.92) / canvasH, 1);
    const tx = (vw - canvasW * scale) / 2;
    return { scale, tx, ty: 16 };
  }, [canvasW, canvasH]);

  // set initial view once nodes are laid out
  useEffect(() => {
    if (!allNodes.length) return;
    const tf = fitView();
    if (!tf) return;
    setTransform(tf);
    tfRef.current = tf;
  }, [allNodes, fitView]);

  const animateTo = useCallback((to: TF) => {
    if (stopAnim.current) stopAnim.current();
    const from = tfRef.current;
    stopAnim.current = runAnim(from, to, (t) => {
      setTransform(t);
      tfRef.current = t;
    });
  }, []);

  const resetView = useCallback(() => {
    const tf = fitView();
    if (tf) animateTo(tf);
  }, [fitView, animateTo]);

  // dept filter → auto-center
  const centerOnDept = useCallback((dept: string) => {
    const el = wrapRef.current;
    if (!el || !allNodes.length) return;
    if (dept === 'all') { resetView(); return; }
    const nodes = allNodes.filter((n) => n.department === dept);
    if (!nodes.length) { resetView(); return; }
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H));
    const bw   = maxX - minX + NODE_W;
    const bh   = maxY - minY + NODE_H;
    const scale = Math.min((vw * 0.82) / bw, (vh * 0.82) / bh, 1.4);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    animateTo({ scale, tx: vw / 2 - cx * scale, ty: vh / 2 - cy * scale });
  }, [allNodes, animateTo, resetView]);

  const handleDeptClick = useCallback((dept: string) => {
    setActiveDept(dept);
    centerOnDept(dept);
  }, [centerOnDept]);

  // ── Pan ────────────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    dragRef.current = {
      ox: e.clientX, oy: e.clientY,
      otx: tfRef.current.tx, oty: tfRef.current.ty,
    };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.ox;
    const dy = e.clientY - dragRef.current.oy;
    if (Math.abs(dx) + Math.abs(dy) > 3) isDragging.current = true;
    const next: TF = { ...tfRef.current, tx: dragRef.current.otx + dx, ty: dragRef.current.oty + dy };
    setTransform(next);
    tfRef.current = next;
  }, []);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Zoom ───────────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { scale, tx, ty } = tfRef.current;
    const factor  = e.deltaY < 0 ? 1.1 : 0.9;
    const ns = Math.max(0.1, Math.min(3, scale * factor));
    const next: TF = { scale: ns, tx: mx - (mx - tx) * (ns / scale), ty: my - (my - ty) * (ns / scale) };
    setTransform(next);
    tfRef.current = next;
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Derived data ───────────────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const set = new Set(allNodes.map((n) => n.department));
    return [...set].sort((a, b) => {
      const ia = KNOWN_ORDER.indexOf(a), ib = KNOWN_ORDER.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    });
  }, [allNodes]);

  const searchQ = search.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (!searchQ) return new Set<string>();
    return new Set(
      allNodes
        .filter((n) => n.name.toLowerCase().includes(searchQ) || n.role.toLowerCase().includes(searchQ))
        .map((n) => n.id),
    );
  }, [allNodes, searchQ]);

  const edges = useMemo(() => {
    if (!root) return [];
    const out: { parent: OrgTreeNode; child: OrgTreeNode }[] = [];
    function walk(n: OrgTreeNode) {
      for (const c of n.children) { out.push({ parent: n, child: c }); walk(c); }
    }
    walk(root);
    return out;
  }, [root]);

  const levelCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const n of allNodes) counts[n.level] = (counts[n.level] ?? 0) + 1;
    return Object.entries(counts).sort(([a], [b]) => +a - +b).map(([l, c]) => ({ level: +l, count: c }));
  }, [allNodes]);

  const memberCount = useMemo(
    () => (activeDept === 'all' ? allNodes.length : allNodes.filter((n) => n.department === activeDept).length),
    [allNodes, activeDept],
  );

  const isVirtualRoot = root?.id === '__root__';

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile fallback */}
      <div
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          height: '100%',
          gap: 12,
          color: '#64748b',
          fontSize: 14,
          textAlign: 'center',
          padding: 24,
        }}
        className="mobile-chart-msg"
      >
        <span style={{ fontSize: 40 }}>🖥️</span>
        <strong style={{ color: '#1e293b', fontSize: 16 }}>Org chart is desktop-only</strong>
        <span>Please open this page on a larger screen.</span>
      </div>

      {/* Desktop canvas */}
      <div
        className="hide-on-mobile"
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {/* Dot-grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: '#F0F4F8',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          zIndex: 0,
        }} />

        {/* ── Dept filter bar ──────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: 999,
          border: '1px solid #e2e8f0',
          padding: '6px 10px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}>
          {['all', ...departments].map((dept) => {
            const active = activeDept === dept;
            const color  = dept === 'all' ? '#0C447C' : deptColor(dept);
            return (
              <button
                key={dept}
                onClick={() => handleDeptClick(dept)}
                style={{
                  padding: '4px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? `2px solid ${color}` : '2px solid transparent',
                  backgroundColor: active ? `${color}18` : 'transparent',
                  color: active ? color : '#64748b',
                  transition: 'all 150ms ease',
                  letterSpacing: '0.02em',
                }}
              >
                {dept === 'all' ? 'All' : dept}
              </button>
            );
          })}
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or role…"
            style={{
              height: 36,
              width: 200,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              backgroundColor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              padding: '0 12px',
              fontSize: 12,
              color: '#1e293b',
              outline: 'none',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}
          />
        </div>

        {/* ── Active dept badge (top-left) ─────────────────────────────────── */}
        {activeDept !== 'all' && (
          <div style={{
            position: 'absolute', top: 16, left: 16, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 6,
            backgroundColor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${deptColor(activeDept)}`,
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 12, fontWeight: 600,
            color: deptColor(activeDept),
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: deptColor(activeDept) }} />
            {activeDept} · {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </div>
        )}

        {/* ── Pannable / zoomable canvas ───────────────────────────────────── */}
        <div
          ref={wrapRef}
          style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: isDragging.current ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div
            style={{
              transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              position: 'relative',
              width: canvasW,
              height: canvasH,
            }}
          >
            <OrgEdges edges={edges} activeDept={activeDept} width={canvasW} height={canvasH} />

            {allNodes.map((node) => {
              if (isVirtualRoot && node.id === '__root__') return null;
              const dimmed = activeDept !== 'all' && node.department !== activeDept && node.id !== root?.id;
              return (
                <OrgNode
                  key={node.id}
                  node={node}
                  isDimmed={dimmed}
                  isSearchMatch={matchIds.has(node.id)}
                />
              );
            })}
          </div>
        </div>

        {/* ── Zoom controls (bottom-right) ─────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 20, right: 20, zIndex: 20,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {[
            { label: '+', action: () => { const s = tfRef.current; animateTo({ ...s, scale: Math.min(3, s.scale * 1.2) }); } },
            { label: '−', action: () => { const s = tfRef.current; animateTo({ ...s, scale: Math.max(0.1, s.scale * 0.8) }); } },
            { label: '⟲', action: resetView },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: 36, height: 36,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: label === '⟲' ? 16 : 20,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Level badges (bottom-left) ────────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 20, left: 16, zIndex: 20,
          display: 'flex', gap: 6,
        }}>
          {levelCounts.slice(0, 5).map(({ level, count }) => (
            <div
              key={level}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: 'rgba(255,255,255,0.92)',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              L{level} · {count}
            </div>
          ))}
        </div>
      </div>

      {/* CSS for mobile/desktop toggling */}
      <style>{`
        @media (max-width: 767px) {
          .hide-on-mobile { display: none !important; }
          .mobile-chart-msg { display: flex !important; }
        }
      `}</style>
    </>
  );
}

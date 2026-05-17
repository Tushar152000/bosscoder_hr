'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { initials, cn } from '@/lib/utils';

export interface TreeEmployee {
  employeeId: string;
  displayName: string;
  email: string;
  designation: string;
  department: string;
  managerId: string | null;
  active: boolean;
}

interface TreeNode extends TreeEmployee {
  children: TreeNode[];
}

function buildForest(employees: TreeEmployee[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const e of employees) byId.set(e.employeeId, { ...e, children: [] });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.managerId && byId.has(node.managerId)) {
      byId.get(node.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) => a.displayName.localeCompare(b.displayName));
    n.children.forEach(sortRec);
  };
  roots.sort((a, b) => a.displayName.localeCompare(b.displayName));
  roots.forEach(sortRec);
  return roots;
}

export function OrgTree({ employees }: { employees: TreeEmployee[] }) {
  const roots = useMemo(() => buildForest(employees), [employees]);
  if (roots.length === 0) {
    return <p className="text-sm text-muted">No employees yet.</p>;
  }
  return (
    <ul className="space-y-1">
      {roots.map((node) => (
        <TreeNodeView key={node.employeeId} node={node} depth={0} />
      ))}
    </ul>
  );
}

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.04]',
          !node.active && 'opacity-60'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={!hasChildren}
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted hover:text-white disabled:opacity-0"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Link
          href={`/directory/${node.employeeId}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-500/15 text-[11px] font-semibold text-accent-200 ring-1 ring-accent-500/30">
            {initials(node.displayName, node.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{node.displayName}</div>
            <div className="truncate text-xs text-muted">
              {node.designation} · {node.department}
            </div>
          </div>
          {hasChildren && (
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-white/10">
              {node.children.length}
            </span>
          )}
        </Link>
      </div>
      {open && hasChildren && (
        <ul className="space-y-1">
          {node.children.map((c) => (
            <TreeNodeView key={c.employeeId} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

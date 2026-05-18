import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { hasAnyRole } from '@/lib/auth/roles';
import { getAllEmployeesForTree } from '@/lib/firestore/employees';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';
import { OrgTreeClient, type TreeNodeData } from '@/components/directory/org-tree-client';

export const metadata = { title: 'Org tree' };

export default async function OrgTreePage() {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'founder', 'hr', 'manager')) {
    redirect('/?error=forbidden');
  }

  const employees = await getAllEmployeesForTree();

  // Build children map for stats
  const childrenMap = new Map<string, string[]>();
  for (const e of employees) {
    if (e.managerId) {
      const list = childrenMap.get(e.managerId) ?? [];
      list.push(e.employeeId);
      childrenMap.set(e.managerId, list);
    }
  }
  const employeeIds = new Set(employees.map(e => e.employeeId));

  // Memoised recursive stats: downstream count + max depth
  const memo = new Map<string, { count: number; depth: number }>();
  function subtreeStats(id: string, d: number): { count: number; depth: number } {
    if (memo.has(id)) return memo.get(id)!;
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) { const r = { count: 0, depth: d }; memo.set(id, r); return r; }
    let total = 0, max = d;
    for (const cid of children) {
      const s = subtreeStats(cid, d + 1);
      total += 1 + s.count;
      max = Math.max(max, s.depth);
    }
    const r = { count: total, depth: max }; memo.set(id, r); return r;
  }

  const nodes: TreeNodeData[] = employees.map(e => {
    const directReportsCount = (childrenMap.get(e.employeeId) ?? []).length;
    const { count: totalDownstreamCount } = subtreeStats(e.employeeId, 0);
    const isRoot = !e.managerId || !employeeIds.has(e.managerId);
    const role: TreeNodeData['role'] =
      isRoot && directReportsCount > 0 ? 'FOUNDER'
      : directReportsCount > 0 ? 'MANAGER'
      : 'EMPLOYEE';
    return {
      id: e.employeeId,
      name: e.displayName,
      designation: e.designation ?? '',
      department: e.department ?? '',
      initials: initials(e.displayName, e.email),
      avatarColor: colorForName(e.displayName),
      managerId: e.managerId ?? null,
      role,
      directReportsCount,
      totalDownstreamCount,
      joinedAt: formatDate(e.joiningDate),
      email: e.email,
    };
  });

  const totalManagers = nodes.filter(n => n.directReportsCount > 0).length;
  const totalDepts = new Set(nodes.map(n => n.department).filter(Boolean)).size;
  const orphans = nodes.filter(n => !n.managerId && n.directReportsCount === 0);

  let maxDepth = 0;
  for (const n of nodes.filter(r => !r.managerId)) {
    const { depth } = subtreeStats(n.id, 0);
    maxDepth = Math.max(maxDepth, depth);
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6">
        <OrgTreeClient
          nodes={nodes}
          totalPeople={nodes.length}
          totalManagers={totalManagers}
          totalDepts={totalDepts}
          maxDepth={maxDepth}
          orphans={orphans}
        />
      </div>
    </div>
  );
}
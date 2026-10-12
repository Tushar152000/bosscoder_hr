import { requireUser } from '@/lib/auth/guard';
import { getAllEmployeesForTree } from '@/lib/firestore/employees';
import { founderEmails } from '@/lib/auth/roles';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';
import { OrgTreeClient, type TreeNodeData } from '@/components/directory/org-tree-client';

export const metadata = { title: 'Org tree' };

export default async function OrgTreePage() {
  await requireUser();
  const employees = await getAllEmployeesForTree();
  const employeeIds = new Set(employees.map(e => e.employeeId));

  // A manager id that points at no one counts as "no manager".
  const managerOf = (id: string | null) => (id && employeeIds.has(id) ? id : null);

  const childrenMap = new Map<string, string[]>();
  for (const e of employees) {
    const m = managerOf(e.managerId);
    if (m) {
      const list = childrenMap.get(m) ?? [];
      list.push(e.employeeId);
      childrenMap.set(m, list);
    }
  }

  // Memoised downstream count. `visiting` guards against manager loops in the data.
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  function downstream(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let total = 0;
    for (const cid of childrenMap.get(id) ?? []) total += 1 + downstream(cid);
    visiting.delete(id);
    memo.set(id, total);
    return total;
  }

  // Founder comes from the FOUNDER_EMAILS setting. If none of them are in the
  // directory, fall back to the top-level person with the biggest org.
  const founderSet = new Set(founderEmails());
  let founderIds = new Set(
    employees.filter(e => founderSet.has(e.email.toLowerCase())).map(e => e.employeeId),
  );
  if (founderIds.size === 0) {
    const top = employees
      .filter(e => !managerOf(e.managerId))
      .sort((a, b) => downstream(b.employeeId) - downstream(a.employeeId))[0];
    if (top && downstream(top.employeeId) > 0) founderIds = new Set([top.employeeId]);
  }

  const nodes: TreeNodeData[] = employees.map(e => {
    const directReportsCount = (childrenMap.get(e.employeeId) ?? []).length;
    const role: TreeNodeData['role'] = founderIds.has(e.employeeId)
      ? 'FOUNDER'
      : directReportsCount > 0
      ? 'MANAGER'
      : 'EMPLOYEE';
    return {
      id: e.employeeId,
      name: e.displayName,
      designation: e.designation ?? '',
      department: e.department ?? '',
      initials: initials(e.displayName, e.email),
      avatarColor: colorForName(e.displayName),
      managerId: managerOf(e.managerId),
      role,
      directReportsCount,
      totalDownstreamCount: downstream(e.employeeId),
      joinedAt: formatDate(e.joiningDate),
      email: e.email,
    };
  });

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <div className="w-full px-4 md:px-10 py-6">
        <OrgTreeClient nodes={nodes} />
      </div>
    </div>
  );
}

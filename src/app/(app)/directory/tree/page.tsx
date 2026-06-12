import { requireUser } from '@/lib/auth/guard';
import { getAllEmployeesForTree } from '@/lib/firestore/employees';
import { OrgChart } from '@/components/org-chart/OrgChart';

export const metadata = { title: 'Org tree' };

export default async function OrgTreePage() {
  await requireUser();
  const employees = await getAllEmployeesForTree();

  const people = employees
    .filter((e) => e.active)
    .map((e) => ({
      id: e.employeeId,
      name: e.displayName,
      role: (e.designation || 'Team Member').trim(),
      department: (e.department || 'General').trim(),
      managerId: e.managerId ?? null,
    }));

  return (
    <div style={{ height: 'calc(100vh - 3.5rem)', overflow: 'hidden' }}>
      <OrgChart people={people} />
    </div>
  );
}
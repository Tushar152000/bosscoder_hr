'use server';

import { getAllEmployeesForTree } from '@/lib/firestore/employees';
import type { OrgPerson } from '@/components/org-chart/types';

export async function getOrgTree(): Promise<OrgPerson[]> {
  const employees = await getAllEmployeesForTree();
  return employees
    .filter((e) => e.active)
    .map((e) => ({
      id: e.employeeId,
      name: e.displayName,
      role: (e.designation || 'Team Member').trim(),
      department: (e.department || 'General').trim(),
      managerId: e.managerId ?? null,
    }));
}

import { requireUser } from '@/lib/auth/guard';
import { founderEmails, isPrivileged } from '@/lib/auth/roles';
import { listEmployees } from '@/lib/firestore/employees';
import { listHrUsers } from '@/lib/firestore/users';
import { canEditEmployees } from '@/lib/auth/employee-access';
import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { colorForName } from '@/lib/directory/colors';
import { DirectoryClient } from '@/components/directory/directory-client';
import type { DirectoryPerson } from '@/types/directory';
import type { EmployeePublic } from '@/types/employee';

export const metadata = { title: 'Directory' };

export default async function DirectoryPage() {
  const user = await requireUser();

  const priv = isPrivileged(user.roles);
  const [employees, hrUsers] = await Promise.all([
    listEmployees({ status: priv ? 'any' : 'active', limit: 500 }),
    listHrUsers(),
  ]);

  // uid → photoURL map so we can show real profile photos
  const photoByUid = new Map(
    hrUsers
      .filter((u) => u.photoURL)
      .map((u) => [u.uid, u.photoURL as string]),
  );

  const people = buildPeople(employees, photoByUid);

  return (
    <DirectoryClient
      people={people}
      totalEmployees={people.filter((p) => p.status !== 'left').length}
      totalManagers={people.filter((p) => p.reportsCount > 0).length}
      canCreate={canEditEmployees(user)}
      canFilterStatus={priv}
    />
  );
}

function buildPeople(employees: EmployeePublic[], photoByUid: Map<string, string>): DirectoryPerson[] {
  const byId = new Map(employees.map((e) => [e.employeeId, e]));
  const founders = new Set(founderEmails());

  const reportsByMgr = new Map<string, string[]>();
  for (const e of employees) {
    if (e.managerId && byId.has(e.managerId)) {
      const list = reportsByMgr.get(e.managerId) ?? [];
      list.push(e.employeeId);
      reportsByMgr.set(e.managerId, list);
    }
  }

  // Memoised team size. `visiting` guards against manager loops in the data.
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  function teamSize(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let total = 0;
    for (const cid of reportsByMgr.get(id) ?? []) total += 1 + teamSize(cid);
    visiting.delete(id);
    memo.set(id, total);
    return total;
  }

  return employees.map((e) => {
    const manager = e.managerId ? byId.get(e.managerId) ?? null : null;
    return {
      id: e.employeeId,
      name: e.displayName,
      email: e.email,
      designation: e.designation ?? '',
      department: e.department ?? '',
      avatarColor: colorForName(e.displayName),
      initials: initials(e.displayName, e.email),
      joinedAt: formatDate(e.joiningDate),
      joinedISO: e.joiningDate.toISOString(),
      status: e.status,
      employmentType: e.employmentType,
      photoURL: e.userUid ? (photoByUid.get(e.userUid) ?? null) : null,
      managerId: manager ? manager.employeeId : null,
      managerName: manager ? manager.displayName : null,
      reportsCount: (reportsByMgr.get(e.employeeId) ?? []).length,
      teamSize: teamSize(e.employeeId),
      isFounder: founders.has(e.email.toLowerCase()),
    };
  });
}

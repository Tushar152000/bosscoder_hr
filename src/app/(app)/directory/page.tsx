import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { listEmployees, getEmployeeByUserUid } from '@/lib/firestore/employees';
import { canEditEmployees } from '@/lib/auth/employee-access';
import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { colorForName } from '@/lib/directory/colors';
import { DirectoryClient } from '@/components/directory/directory-client';
import type {
  DirectoryView,
  DirectoryDept,
  DirectoryManager,
  DirectoryPerson,
  DirectoryReport,
} from '@/types/directory';
import type { EmployeePublic } from '@/types/employee';

export const metadata = { title: 'Directory' };

export default async function DirectoryPage() {
  const user = await requireUser();

  const priv = isPrivileged(user.roles);

  let employees: EmployeePublic[];

  if (priv) {
    employees = await listEmployees({ status: 'any', limit: 500 });
  } else {

    const me = await getEmployeeByUserUid(user.uid);
    if (!me) redirect('/?error=forbidden');
    const reports = await listEmployees({ managerId: me.employeeId, status: 'any' });
    employees = [me, ...reports];
  }

  const view = buildDirectoryView(employees);
  const totalManagers = view.departments.reduce((s, d) => s + d.managers.length, 0);

  return (
    <DirectoryClient
      view={view}
      totalEmployees={employees.length}
      totalManagers={totalManagers}
      canCreate={canEditEmployees(user)}
    />
  );
}

function toPerson(e: EmployeePublic): DirectoryPerson {
  return {
    id: e.employeeId,
    name: e.displayName,
    email: e.email,
    designation: e.designation,
    avatarColor: colorForName(e.displayName),
    initials: initials(e.displayName, e.email),
    joinedAt: formatDate(e.joiningDate),
    status: e.status,
  };
}

function toReport(e: EmployeePublic): DirectoryReport {
  return { ...toPerson(e), type: e.employmentType };
}

function buildDirectoryView(employees: EmployeePublic[]): DirectoryView {
  const byId = new Map(employees.map((e) => [e.employeeId, e]));

  const reportsByMgr = new Map<string, EmployeePublic[]>();
  for (const e of employees) {
    if (e.managerId && byId.has(e.managerId)) {
      const list = reportsByMgr.get(e.managerId) ?? [];
      list.push(e);
      reportsByMgr.set(e.managerId, list);
    }
  }

  const mgrIds = new Set(reportsByMgr.keys());
  const UNASSIGNED = '__unassigned__';
  const deptNames = [
    ...[...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    // Always append unassigned bucket last if any stub employees exist
    ...(employees.some((e) => !e.department) ? [UNASSIGNED] : []),
  ];

  const departments: DirectoryDept[] = deptNames.map((deptName) => {
    const isUnassigned = deptName === UNASSIGNED;
    const deptEmps = isUnassigned
      ? employees.filter((e) => !e.department)
      : employees.filter((e) => e.department === deptName);
    const counted = new Set<string>();
    const managers: DirectoryManager[] = deptEmps
      .filter((e) => mgrIds.has(e.employeeId))
      .map((mgr) => {
        counted.add(mgr.employeeId);
        const reports = reportsByMgr.get(mgr.employeeId) ?? [];
        reports.forEach((r) => counted.add(r.employeeId));
        return { user: toPerson(mgr), reports: reports.map(toReport) };
      });

    // Solo employees (no manager relationship in the loaded set)
    for (const e of deptEmps) {
      if (!counted.has(e.employeeId)) {
        managers.push({ user: toPerson(e), reports: [] });
      }
    }

    return {
      id: isUnassigned ? 'unassigned' : deptName.toLowerCase().replace(/\s+/g, '-'),
      name: isUnassigned ? 'Needs setup' : deptName,
      memberCount: deptEmps.length,
      managers,
    };
  });

  return { departments };
}

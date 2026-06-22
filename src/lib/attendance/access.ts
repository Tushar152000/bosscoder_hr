import 'server-only';
import { hasAnyRole, type Role } from '@/lib/auth/roles';
import { listEmployees } from '@/lib/firestore/employees';

/** Departments the attendance feature is currently rolled out to. */
const ROLLOUT_DEPARTMENTS = ['Technology', 'Corporate Relations', 'HR & Finance', 'Finance', 'Marketing', 'Product'];

/**
 * Who may access Attendance during the staged rollout:
 *  - HR / founders (always),
 *  - employees in a rollout department,
 *  - reporting managers who have at least one direct report in a rollout
 *    department (even if the manager sits in another department).
 */
export async function canAccessAttendance(
  roles: Role[],
  employee: { employeeId: string; department: string | null } | null,
): Promise<boolean> {
  if (hasAnyRole(roles, 'hr', 'founder')) return true;
  if (!employee) return false;
  if (employee.department && ROLLOUT_DEPARTMENTS.includes(employee.department)) return true;

  // Manager of a rollout-department employee?
  const reports = await listEmployees({ managerId: employee.employeeId });
  return reports.some((r) => r.department != null && ROLLOUT_DEPARTMENTS.includes(r.department));
}

import 'server-only';
import { hasAnyRole, type Role } from '@/lib/auth/roles';
import { listEmployees } from '@/lib/firestore/employees';

/** Department the attendance feature is currently rolled out to. */
const ROLLOUT_DEPARTMENT = 'Technology';

/**
 * Who may access Attendance during the staged rollout:
 *  - HR / founders (always),
 *  - employees in the rollout department,
 *  - reporting managers who have at least one direct report in that department
 *    (even if the manager sits in another department).
 */
export async function canAccessAttendance(
  roles: Role[],
  employee: { employeeId: string; department: string | null } | null,
): Promise<boolean> {
  if (hasAnyRole(roles, 'hr', 'founder')) return true;
  if (!employee) return false;
  if (employee.department === ROLLOUT_DEPARTMENT) return true;

  // Manager of a rollout-department employee?
  const reports = await listEmployees({ managerId: employee.employeeId });
  return reports.some((r) => r.department === ROLLOUT_DEPARTMENT);
}

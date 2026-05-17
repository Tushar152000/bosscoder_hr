import 'server-only';
import type { CurrentUser } from '@/lib/auth/session';
import type { EmployeePublic } from '@/types/employee';
import { hasAnyRole, isPrivileged } from '@/lib/auth/roles';
import { getDescendantEmployeeIds, getEmployeeByUserUid } from '@/lib/firestore/employees';

/** Can the user create / edit / deactivate employee records at all? */
export function canEditEmployees(user: CurrentUser): boolean {
  return user.permissions.includes('manage_employees');
}

/** Can the user see compensation / bank / etc. for ANYONE? */
export function canViewCompensation(user: CurrentUser): boolean {
  return user.permissions.includes('view_compensation');
}

export function canViewPersonalDocuments(user: CurrentUser): boolean {
  return user.permissions.includes('view_personal_documents');
}

/**
 * Manager scope: full subtree under the manager's own employee record.
 * Computed on demand — cached on the request via the closure if needed.
 */
export async function getManagerSubtreeIds(user: CurrentUser): Promise<Set<string> | null> {
  if (!hasAnyRole(user.roles, 'manager')) return null;
  const ownEmployee = await getEmployeeByUserUid(user.uid);
  if (!ownEmployee) return new Set();
  const descendants = await getDescendantEmployeeIds(ownEmployee.employeeId);
  // Manager's own record is implicitly visible too.
  descendants.add(ownEmployee.employeeId);
  return descendants;
}

/** Can `user` view the public profile of `target`? */
export async function canViewEmployee(
  user: CurrentUser,
  target: EmployeePublic
): Promise<boolean> {
  if (isPrivileged(user.roles)) return true;
  if (target.userUid === user.uid) return true;
  const subtree = await getManagerSubtreeIds(user);
  if (subtree?.has(target.employeeId)) return true;
  // Default: any signed-in employee can see the basic directory listing of active employees.
  return target.active;
}

/** Can `user` see SENSITIVE (encrypted) fields for `target`? */
export async function canViewSensitiveFor(
  user: CurrentUser,
  target: EmployeePublic
): Promise<boolean> {
  // Always: own profile.
  if (target.userUid === user.uid) return true;
  // Founders / HR with explicit permission.
  if (isPrivileged(user.roles) && (canViewCompensation(user) || canViewPersonalDocuments(user))) {
    return true;
  }
  return false;
}

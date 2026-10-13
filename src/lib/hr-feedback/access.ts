import { hasAnyRole } from '@/lib/auth/roles';
import type { CurrentUser } from '@/lib/auth/session';

/** HR and founders read and answer feedback sent to HR. */
export function canManageHrFeedback(user: Pick<CurrentUser, 'roles'>): boolean {
  return hasAnyRole(user.roles, 'hr', 'founder');
}

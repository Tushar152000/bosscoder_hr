import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/session';
import { hasAnyRole, type Permission, type Role } from '@/lib/auth/roles';

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRoles(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, ...roles)) redirect('/?error=forbidden');
  return user;
}

export async function requirePermission(perm: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.permissions.includes(perm)) redirect('/?error=forbidden');
  return user;
}

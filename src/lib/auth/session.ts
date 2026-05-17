import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import type { Permission, Role } from '@/lib/auth/roles';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth/cookie';

export { SESSION_COOKIE, SESSION_MAX_AGE_MS };

export interface CurrentUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  roles: Role[];
  permissions: Permission[];
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

/**
 * Per-request memoization. `requireUser`, `requirePermission`, layouts and
 * pages all call this — without `cache()` we'd verify the session cookie 3-5x
 * per request. With it, exactly once.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    const roles = (decoded.roles as Role[] | undefined) ?? [];
    const permissions = (decoded.perms as Permission[] | undefined) ?? [];
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: (decoded.name as string | null) ?? null,
      photoURL: (decoded.picture as string | null) ?? null,
      roles,
      permissions,
    };
  } catch {
    return null;
  }
});

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}

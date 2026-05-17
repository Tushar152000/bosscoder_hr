'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { adminAuth } from '@/lib/firebase/admin';
import {
  PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from '@/lib/auth/roles';
import { syncCustomClaimsFromFirestore } from '@/lib/auth/claims';
import {
  deleteHrUserDoc,
  getHrUser,
  setHrUserActive,
  updateHrUserRolesAndPermissions,
} from '@/lib/firestore/users';
import { writeAuditLog } from '@/lib/audit';
import { redirect } from 'next/navigation';

export type ActionResult = { ok: true } | { ok: false; error: string };

const updateSchema = z.object({
  uid: z.string().min(1),
  roles: z.array(z.enum(ROLES)).min(1, 'At least one role required'),
  permissions: z.array(z.enum(PERMISSIONS)),
});

export async function updateUserRolesAction(input: {
  uid: string;
  roles: Role[];
  permissions: Permission[];
}): Promise<ActionResult> {
  const actor = await requireUser();
  if (!actor.permissions.includes('manage_roles')) {
    return { ok: false, error: 'Forbidden: missing manage_roles permission' };
  }
  if (input.uid === actor.uid) {
    return {
      ok: false,
      error:
        'You cannot edit your own roles or permissions. Ask another founder / HR admin to do it.',
    };
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const target = await getHrUser(parsed.data.uid);
  if (!target) return { ok: false, error: 'User not found' };

  try {
    await updateHrUserRolesAndPermissions(parsed.data);
    await syncCustomClaimsFromFirestore(parsed.data.uid);
    await writeAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'role.update',
      resource: { type: 'hr_user', id: parsed.data.uid },
      metadata: {
        from: { roles: target.roles, permissions: target.permissions },
        to: { roles: parsed.data.roles, permissions: parsed.data.permissions },
      },
    });
    revalidatePath('/admin/roles');
    revalidatePath(`/admin/roles/${parsed.data.uid}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function setUserActiveAction(uid: string, active: boolean): Promise<ActionResult> {
  const actor = await requireUser();
  if (!actor.permissions.includes('manage_roles')) {
    return { ok: false, error: 'Forbidden: missing manage_roles permission' };
  }
  if (uid === actor.uid) {
    return { ok: false, error: 'You cannot deactivate your own account.' };
  }
  try {
    await setHrUserActive(uid, active);
    if (!active) {
      // Force the deactivated user out of every active session.
      await adminAuth.revokeRefreshTokens(uid);
    }
    await writeAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'permission.update',
      resource: { type: 'hr_user', id: uid },
      metadata: { active },
    });
    revalidatePath('/admin/roles');
    revalidatePath(`/admin/roles/${uid}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

/**
 * Hard-delete a portal account.
 *  - Removes the hr_users Firestore doc
 *  - Deletes the Firebase Auth user (revokes all sessions, frees the UID)
 *  - Audit-logs the deletion
 *
 * The user can still sign back in with the same Google account afterwards —
 * doing so will create a fresh hr_users record (default `employee`). To prevent
 * re-entry entirely, also remove their email from FOUNDER_EMAILS and
 * ALLOWED_AUTH_DOMAINS (or restrict at the Google Workspace level).
 */
export async function deleteUserAccountAction(uid: string): Promise<ActionResult> {
  const actor = await requireUser();
  if (!actor.permissions.includes('manage_roles')) {
    return { ok: false, error: 'Forbidden: missing manage_roles permission' };
  }
  if (uid === actor.uid) {
    return { ok: false, error: 'You cannot delete your own account.' };
  }
  const target = await getHrUser(uid);
  if (!target) return { ok: false, error: 'User not found' };

  try {
    await deleteHrUserDoc(uid);
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr) {
      // If the auth user is already gone, that's fine — we still removed the Firestore record.
      const code = (authErr as { code?: string }).code;
      if (code !== 'auth/user-not-found') {
        // Best-effort: log and continue
        console.error('Failed to delete auth user', authErr);
      }
    }
    await writeAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'permission.update',
      resource: { type: 'hr_user', id: uid },
      metadata: { op: 'delete', email: target.email, displayName: target.displayName },
    });
    revalidatePath('/admin/roles');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed' };
  }
}

export async function deleteUserAndRedirect(uid: string): Promise<void> {
  const res = await deleteUserAccountAction(uid);
  if (res.ok) redirect('/admin/roles');
}

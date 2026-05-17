'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDialog } from '@/components/ui/modal';
import {
  PERMISSIONS,
  ROLES,
  defaultPermissionsForRoles,
  type Permission,
  type Role,
} from '@/lib/auth/roles';
import {
  deleteUserAccountAction,
  setUserActiveAction,
  updateUserRolesAction,
} from '@/app/(app)/admin/roles/actions';

interface Props {
  uid: string;
  email: string;
  displayName: string | null;
  initialRoles: Role[];
  initialPermissions: Permission[];
  active: boolean;
  isSelf: boolean;
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  founder: 'Full access. All permissions auto-granted on assignment.',
  hr: 'HR ops — manage employees, run review cycles, generate offer letters.',
  manager: 'Sees their org-tree subtree on the directory.',
  employee: 'Default. Sees the directory, can fill their own self-eval.',
};

const PERMISSION_LABELS: Record<Permission, { label: string; hint: string }> = {
  view_compensation: {
    label: 'View compensation',
    hint: 'Read salary / CTC / bonus on employee profiles.',
  },
  view_personal_documents: {
    label: 'View personal documents',
    hint: 'Read PAN, Aadhaar, address, DOB, emergency contact.',
  },
  manage_employees: {
    label: 'Manage employees',
    hint: 'Create / edit / deactivate employee records.',
  },
  manage_review_cycles: {
    label: 'Manage review cycles',
    hint: 'Create, open, and close performance review cycles.',
  },
  manage_offer_letters: {
    label: 'Manage offer letters',
    hint: 'Create, edit, and download offer letters for new hires and interns.',
  },
  manage_roles: {
    label: 'Manage roles',
    hint: 'Assign roles & permissions on this page. Powerful — keep tight.',
  },
  view_audit_log: {
    label: 'View audit log',
    hint: 'See the full history of privileged reads and admin changes.',
  },
};

export function RolesForm({
  uid,
  email,
  displayName,
  initialRoles,
  initialPermissions,
  active,
  isSelf,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [perms, setPerms] = useState<Permission[]>(initialPermissions);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const { confirm, promptText, dialog } = useDialog();

  const dirty =
    !arraysEqual(roles, initialRoles) || !arraysEqual(perms, initialPermissions);

  const defaultPermsForCurrentRoles = useMemo(
    () => defaultPermissionsForRoles(roles),
    [roles]
  );

  function toggleRole(r: Role) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }
  function togglePerm(p: Permission) {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }
  function applyRoleDefaults() {
    setPerms(defaultPermissionsForRoles(roles));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await updateUserRolesAction({ uid, roles, permissions: perms });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(new Date().toISOString());
      router.refresh();
    });
  }

  async function toggleActive() {
    const ok = await confirm({
      title: active ? `Deactivate ${email}?` : `Reactivate ${email}?`,
      body: active
        ? 'They will be signed out immediately and can no longer log in until reactivated.'
        : 'They will be able to sign in again with their existing account.',
      confirmLabel: active ? 'Deactivate' : 'Reactivate',
      intent: active ? 'danger' : 'default',
    });
    if (!ok) return;
    start(async () => {
      const res = await setUserActiveAction(uid, !active);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function deleteAccount() {
    const result = await promptText({
      title: `Delete portal account for ${email}?`,
      body: (
        <>
          This removes their <code className="rounded bg-white/10 px-1 py-0.5 text-[11px] text-white">hr_users</code> record AND their Firebase Auth user.
          Any review submissions they&apos;re the reviewer of will keep the name + email but lose the linked uid.
        </>
      ),
      expected: 'DELETE',
      confirmLabel: 'Delete permanently',
      intent: 'danger',
    });
    if (result !== 'DELETE') return;
    start(async () => {
      const res = await deleteUserAccountAction(uid);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push('/admin/roles');
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {dialog}
      {isSelf && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You can&apos;t edit your own roles or permissions. Ask another admin to make changes for
          you.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account</CardTitle>
            {!active && <Badge variant="danger">Deactivated</Badge>}
          </div>
          <CardDescription>
            {displayName ? `${displayName} · ` : ''}
            {email}
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={active ? 'outline' : 'default'}
              onClick={toggleActive}
              disabled={pending || isSelf}
            >
              {active ? 'Deactivate user' : 'Reactivate user'}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={deleteAccount}
              disabled={pending || isSelf}
            >
              Delete account…
            </Button>
          </div>
          <p className="text-xs text-muted">
            <span className="font-medium">Deactivate</span> revokes all sessions but keeps the
            user record so you can re-enable later.{' '}
            <span className="font-medium">Delete account</span> removes the user record AND the
            Firebase Auth user — irreversible. They could still sign back in (creating a fresh
            employee record) unless you also remove their email from{' '}
            <code className="text-xs">FOUNDER_EMAILS</code> /{' '}
            <code className="text-xs">ALLOWED_AUTH_DOMAINS</code>.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Pick one or more. Multiple roles are union — e.g. an HR who also manages a team can
            have <code className="text-xs">[hr, manager]</code>.
          </CardDescription>
        </CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((r) => {
            const checked = roles.includes(r);
            return (
              <label
                key={r}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-default bg-card px-3 py-2 hover:border-white/20 hover:bg-white/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRole(r)}
                  disabled={isSelf}
                  className="mt-0.5 h-4 w-4 rounded border-default text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="text-sm font-medium capitalize">{r}</div>
                  <div className="text-xs text-muted">{ROLE_DESCRIPTIONS[r]}</div>
                </div>
              </label>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Permissions</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={applyRoleDefaults}
              disabled={isSelf}
            >
              Reset to role defaults
            </Button>
          </div>
          <CardDescription>
            Permissions are checked individually. Founder/HR roles auto-grant the right set —
            override here only if needed.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-2">
          {PERMISSIONS.map((p) => {
            const checked = perms.includes(p);
            const isDefault = defaultPermsForCurrentRoles.includes(p);
            return (
              <label
                key={p}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-default bg-card px-3 py-2 hover:border-white/20 hover:bg-white/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePerm(p)}
                  disabled={isSelf}
                  className="mt-0.5 h-4 w-4 rounded border-default text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{PERMISSION_LABELS[p].label}</span>
                    {isDefault && (
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        role default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">{PERMISSION_LABELS[p].hint}</div>
                </div>
              </label>
            );
          })}
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-2 border-t border-default bg-card px-6 py-3">
        <p className="text-xs text-muted">
          {savedAt
            ? 'Saved. Custom claims refreshed.'
            : dirty
            ? 'Unsaved changes.'
            : 'No changes.'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRoles(initialRoles);
              setPerms(initialPermissions);
            }}
            disabled={pending || !dirty || isSelf}
          >
            Discard
          </Button>
          <Button type="submit" disabled={pending || !dirty || isSelf}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function arraysEqual<T extends string>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

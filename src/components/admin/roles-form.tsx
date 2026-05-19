'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Key,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Check,
  ArrowLeftRight,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { useDialog } from '@/components/ui/modal';
import {
  PERMISSIONS,
  ROLES,
  defaultPermissionsForRoles,
  type Permission,
  type Role,
} from '@/lib/auth/roles';
import { ROLE_META, PERMISSION_META } from '@/lib/roles/meta';
import {
  deleteUserAccountAction,
  setUserActiveAction,
  updateUserRolesAction,
} from '@/app/(app)/admin/roles/actions';

interface Props {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  initialRoles: Role[];
  initialPermissions: Permission[];
  active: boolean;
  isSelf: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

function arraysEqual<T extends string>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function firstRoleThatGrants(roles: Role[], perm: Permission): string {
  for (const r of roles) {
    if (defaultPermissionsForRoles([r]).includes(perm)) return ROLE_META[r].label;
  }
  return 'role';
}

export function RolesForm({
  uid,
  email,
  displayName,
  initialRoles,
  initialPermissions,
  active,
  isSelf,
  createdAt,
  lastLoginAt,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [perms, setPerms] = useState<Permission[]>(initialPermissions);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [savedRoles, setSavedRoles] = useState<Role[]>(initialRoles);
  const [savedPerms, setSavedPerms] = useState<Permission[]>(initialPermissions);
  const { confirm, promptText, dialog } = useDialog();

  const defaultPerms = useMemo(() => defaultPermissionsForRoles(roles), [roles]);
  const isDirty = !arraysEqual(roles, savedRoles) || !arraysEqual(perms, savedPerms);
  const overrideCount = PERMISSIONS.filter(
    (p) => perms.includes(p) !== defaultPerms.includes(p)
  ).length;

  function toggleRole(r: Role) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }
  function togglePerm(p: Permission) {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }
  function applyRoleDefaults() {
    setPerms(defaultPermissionsForRoles(roles));
  }

  async function handleSave() {
    setError(null);
    start(async () => {
      const res = await updateUserRolesAction({ uid, roles, permissions: perms });
      if (!res.ok) { setError(res.error); return; }
      setSavedRoles(roles);
      setSavedPerms(perms);
      const firstName = displayName?.split(' ')[0] ?? email.split('@')[0];
      setSavedMsg(
        `Saved. Custom claims refreshed. ${firstName} will pick up new permissions on next sign-in (within 1 hour).`
      );
      setTimeout(() => setSavedMsg(null), 5000);
      router.refresh();
    });
  }

  async function handleToggleActive() {
    const ok = await confirm({
      title: active ? `Deactivate ${email}?` : `Reactivate ${email}?`,
      body: active
        ? 'Kills all sessions immediately. Record stays — you can reactivate later.'
        : 'Restores access. User can sign in again on their next attempt.',
      confirmLabel: active ? 'Deactivate' : 'Reactivate',
      intent: active ? 'danger' : 'default',
    });
    if (!ok) return;
    start(async () => {
      const res = await setUserActiveAction(uid, !active);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  async function handleDelete() {
    const firstName = displayName?.split(' ')[0] ?? email.split('@')[0];
    const result = await promptText({
      title: `Delete ${firstName}'s account?`,
      body: (
        <>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            This removes the Firestore doc and Firebase Auth user. They could still sign back in
            (creating a fresh employee record) unless you also remove their email from{' '}
            <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              FOUNDER_EMAILS
            </code>{' '}
            /{' '}
            <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              ALLOWED_AUTH_DOMAINS
            </code>
            .
          </p>
          <div className="mt-3 bg-[#FAECE7] border border-[#F1BCB7] rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[#993C1D] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#993C1D] font-medium">This is irreversible.</p>
          </div>
        </>
      ),
      expected: 'DELETE',
      placeholder: 'Type DELETE to confirm',
      confirmLabel: 'Delete account',
      intent: 'danger',
    });
    if (result !== 'DELETE') return;
    start(async () => {
      const res = await deleteUserAccountAction(uid);
      if (!res.ok) { setError(res.error); return; }
      router.push('/admin/roles');
      router.refresh();
    });
  }

  return (
    <>
      {dialog}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-[#E1F5EE] px-4 py-3 text-[12px] text-[#0F6E56]">
          {savedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        {/* ── Main column ── */}
        <main className="flex flex-col gap-2.5">

          {/* Roles card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-3.5">
              <div className="w-6 h-6 rounded-md bg-[#E6F1FB] flex items-center justify-center shrink-0">
                <Shield className="h-3.5 w-3.5 text-[#0C447C]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-slate-900">Roles</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Multi-select.{' '}
                  <code className="font-mono bg-[#F4F7FA] px-1 py-0.5 rounded text-[10px]">
                    [hr, manager]
                  </code>{' '}
                  is valid for someone who runs HR and a team.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const checked = roles.includes(r);
                const meta = ROLE_META[r];
                const Icon = meta.icon;
                return (
                  <label
                    key={r}
                    htmlFor={`role-${r}`}
                    aria-label={`${checked ? 'Remove' : 'Add'} ${meta.label} role`}
                    className={cn(
                      'border rounded-md px-3 py-2.5 cursor-pointer flex items-start gap-2 transition select-none',
                      checked ? 'bg-[#E6F1FB] border-[#0C447C]' : 'bg-white border-slate-200 hover:border-slate-300',
                      isSelf && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <input
                      id={`role-${r}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => !isSelf && toggleRole(r)}
                      disabled={isSelf}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded-[3px] flex-shrink-0 mt-0.5 flex items-center justify-center transition',
                        checked ? 'bg-[#0C447C]' : 'bg-white border border-slate-300'
                      )}
                    >
                      {checked && <Check className="h-[9px] w-[9px] text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Icon
                          className="h-[13px] w-[13px] shrink-0"
                          style={{ color: meta.pillColor }}
                        />
                        <span
                          className={cn(
                            'text-[12px] font-medium',
                            checked ? 'text-[#0C447C]' : 'text-slate-900'
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-[10px] mt-0.5 leading-snug',
                          checked ? 'text-[#185FA5]' : 'text-slate-500'
                        )}
                      >
                        {meta.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Permissions card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-[#FAEEDA] flex items-center justify-center shrink-0">
                  <Key className="h-3.5 w-3.5 text-[#854F0B]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-900">Permissions</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Granular overrides. Role defaults are pre-checked — uncheck to revoke or check extras.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={applyRoleDefaults}
                disabled={isSelf}
                className="shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                Reset to defaults
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              {PERMISSIONS.map((p) => {
                const checked = perms.includes(p);
                const isDefault = defaultPerms.includes(p);
                const meta = PERMISSION_META[p];

                let statusPill: React.ReactNode = null;
                if (checked && isDefault) {
                  statusPill = (
                    <span className="inline-flex items-center text-[9px] font-medium text-slate-500 bg-[#F4F7FA] px-1.5 py-0.5 rounded-full">
                      default for {firstRoleThatGrants(roles, p)}
                    </span>
                  );
                } else if (checked && !isDefault) {
                  statusPill = (
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#854F0B] bg-[#FAEEDA] px-1.5 py-0.5 rounded-full">
                      <ArrowLeftRight className="h-[9px] w-[9px]" />
                      override
                    </span>
                  );
                } else if (!checked && isDefault) {
                  statusPill = (
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#993C1D] bg-[#FAECE7] px-1.5 py-0.5 rounded-full">
                      <Minus className="h-[9px] w-[9px]" />
                      revoked
                    </span>
                  );
                }

                return (
                  <label
                    key={p}
                    htmlFor={`perm-${p}`}
                    aria-label={`${checked ? 'Revoke' : 'Grant'} ${meta.label} permission`}
                    className={cn(
                      'border rounded-md px-3 py-2 cursor-pointer flex items-start gap-2.5 transition select-none',
                      checked
                        ? 'bg-white border-[#0C447C] shadow-[0_1px_2px_rgba(12,68,124,0.05)]'
                        : 'bg-white border-slate-200 hover:border-slate-300',
                      isSelf && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <input
                      id={`perm-${p}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => !isSelf && togglePerm(p)}
                      disabled={isSelf}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded-[3px] flex-shrink-0 mt-0.5 flex items-center justify-center transition',
                        checked ? 'bg-[#0C447C]' : 'bg-white border border-slate-300'
                      )}
                    >
                      {checked && <Check className="h-[9px] w-[9px] text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-slate-900 font-mono">
                          {meta.label}
                        </span>
                        {statusPill}
                        {meta.founderOnly && (
                          <span className="inline-flex items-center text-[9px] font-medium text-[#854F0B] bg-[#FAEEDA] px-1.5 py-0.5 rounded-full">
                            founder only
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{meta.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className="flex flex-col gap-2.5">

          {/* Effective access */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <p className="text-[10px] font-medium tracking-[1px] text-slate-400 uppercase mb-2">
              EFFECTIVE ACCESS
            </p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-[22px] font-medium text-slate-900">{perms.length}</span>
              <span className="text-[11px] text-slate-500">of 7 permissions</span>
            </div>
            <div className="h-[3px] bg-[#F4F7FA] rounded-full mb-2.5">
              <div
                className="h-full bg-[#0C447C] rounded-full transition-all"
                style={{ width: `${(perms.length / 7) * 100}%` }}
              />
            </div>
            {overrideCount > 0 && (
              <div className="bg-[#FAEEDA] border border-[#FAC775] rounded-[5px] px-2 py-1.5 flex items-center gap-1.5">
                <ArrowLeftRight className="h-3 w-3 text-[#854F0B] shrink-0" />
                <p className="text-[10px] text-[#854F0B]">
                  <strong className="font-medium">
                    {overrideCount} manual override{overrideCount !== 1 ? 's' : ''}
                  </strong>{' '}
                  vs role defaults
                </p>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-[#993C1D]" />
              <p className="text-[12px] font-medium text-[#993C1D]">Danger zone</p>
            </div>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              Account-level actions for this user. Both are recorded in the audit log.
            </p>

            {/* Deactivate / Reactivate */}
            <div className="pb-2.5 mb-2.5 border-b border-slate-100">
              <p className="text-[11px] font-medium text-slate-900 mb-0.5">
                {active ? 'Deactivate user' : 'Reactivate user'}
              </p>
              <p className="text-[10px] text-slate-500 leading-snug mb-2">
                {active
                  ? 'Kills all sessions immediately. Record stays — you can reactivate later.'
                  : 'Restores access. User can sign in again on their next attempt.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={pending || isSelf}
                onClick={handleToggleActive}
              >
                {!active && <RotateCcw className="h-3 w-3" />}
                {active ? 'Deactivate' : 'Reactivate'}
              </Button>
            </div>

            {/* Delete */}
            <div>
              <p className="text-[11px] font-medium text-[#993C1D] mb-0.5">Delete account</p>
              <p className="text-[10px] text-slate-500 leading-snug mb-2">
                Removes Firestore doc + Firebase Auth user. Irreversible.
              </p>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="w-full"
                disabled={pending || isSelf}
                onClick={handleDelete}
              >
                Delete account…
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] font-medium tracking-[1px] text-slate-400 uppercase mb-1.5">
              METADATA
            </p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">UID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] font-medium text-slate-900">
                    {uid.slice(0, 8)}…{uid.slice(-4)}
                  </span>
                  <CopyButton value={uid} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">Created</span>
                <span className="text-[10px] font-medium text-slate-900">
                  {createdAt ? formatDate(new Date(createdAt)) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">Last sign-in</span>
                <span className="text-[10px] font-medium text-slate-900 text-right">
                  {lastLoginAt ? formatDateTime(new Date(lastLoginAt)) : '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky save bar — only when dirty */}
      {isDirty && (
        <div
          role="status"
          aria-live="polite"
          className="sticky bottom-0 z-20 mt-2.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-[0_-2px_8px_rgba(12,68,124,0.06)] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <AlertCircle className="h-3 w-3 text-[#854F0B] shrink-0" />
            <span>
              Unsaved changes
              {overrideCount > 0 && (
                <>
                  {' · '}
                  <strong className="font-medium">{overrideCount}</strong>
                  {' permission override'}
                  {overrideCount !== 1 ? 's' : ''}
                </>
              )}
            </span>
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => {
                setRoles(savedRoles);
                setPerms(savedPerms);
              }}
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={pending}
              onClick={handleSave}
              disabled={isSelf}
            >
              Save & sync claims
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

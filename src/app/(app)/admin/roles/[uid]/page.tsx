import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, AlertCircle, CircleOff } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { getHrUser } from '@/lib/firestore/users';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { ROLE_META } from '@/lib/roles/meta';
import { Button } from '@/components/ui/button';
import { RolesForm } from '@/components/admin/roles-form';

interface Props {
  params: Promise<{ uid: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { uid } = await params;
  const u = await getHrUser(uid);
  return { title: u ? `${u.displayName ?? u.email} — Roles` : 'User' };
}

export default async function EditUserRolesPage({ params }: Props) {
  const me = await requirePermission('manage_roles');
  const { uid } = await params;

  const [target, employee] = await Promise.all([
    getHrUser(uid),
    getEmployeeByUserUid(uid),
  ]);
  if (!target) notFound();

  const isSelf = target.uid === me.uid;
  const displayName = target.displayName ?? target.email.split('@')[0];
  const userInitials = initials(target.displayName, target.email);
  const avatarBg = colorForName(target.displayName ?? target.email);

  return (
    <div className="mx-auto  py-6">

      <nav className="flex items-center gap-1 mb-4 text-[11px] text-slate-400">
        <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Admin</span>
        <ChevronRight className="h-3 w-3" />
        <Link href="/admin/roles" className="hover:text-slate-700 transition-colors">Roles</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-700 font-medium truncate max-w-[160px]">{displayName}</span>
      </nav>

      {/* Self-edit banner */}
      {isSelf && (
        <div className="bg-[#FAEEDA] border border-[#FAC775] rounded-md px-3 py-2.5 mb-4 flex items-center gap-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-[#854F0B] shrink-0" />
          <p className="text-[12px] text-[#854F0B]">
            You&apos;re viewing your own account. To prevent lockout, you can&apos;t edit your own
            roles or delete your account.
          </p>
        </div>
      )}

      {/* User header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {target.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={target.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-medium shrink-0"
              style={{ background: avatarBg }}
            >
              {userInitials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[19px] font-medium text-slate-900">{displayName}</h1>
              {target.active ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E1F5EE] text-[#0F6E56] border border-[#BBDFD3]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0F6E56] shrink-0" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAECE7] text-[#993C1D] border border-[#F1BCB7]">
                  <CircleOff className="h-2.5 w-2.5 shrink-0" />
                  Deactivated
                </span>
              )}
              {target.roles.map((r) => {
                const meta = ROLE_META[r];
                return (
                  <span
                    key={r}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: meta.pillBg, color: meta.pillColor }}
                  >
                    {meta.label}
                  </span>
                );
              })}
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {[target.email, employee?.designation, employee?.department]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/admin/roles">← Back to roles</Link>
        </Button>
      </div>

      {/* Form (client) */}
      <RolesForm
        uid={target.uid}
        email={target.email}
        displayName={target.displayName}
        photoURL={target.photoURL}
        initialRoles={target.roles}
        initialPermissions={target.permissions}
        active={target.active}
        isSelf={isSelf}
        createdAt={target.createdAt?.toISOString() ?? null}
        lastLoginAt={target.lastLoginAt?.toISOString() ?? null}
      />
    </div>
  );
}

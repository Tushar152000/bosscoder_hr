import { Info } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { listHrUsers } from '@/lib/firestore/users';
import { RolesList } from '@/components/admin/roles-list';

export const metadata = { title: 'Roles & access · Settings' };

export default async function RolesSettingsPage() {
  const me = await requirePermission('manage_roles');
  const users = await listHrUsers();

  const serialized = users.map((u) => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    roles: u.roles,
    permissions: u.permissions,
    active: u.active,
    createdAt: u.createdAt?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-slate-900">Roles & access</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Assign roles and per-user permissions. Click any user to edit.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAEEDA] border border-[#FAC775] rounded-md text-[13px] text-[#854F0B] shrink-0">
          <Info className="h-3 w-3 shrink-0" />
          Changes propagate on next sign-in ·{' '}
          <strong className="font-medium">up to 1 hour</strong>
        </div>
      </div>

      <RolesList users={serialized} currentUid={me.uid} />
    </div>
  );
}

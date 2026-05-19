import Link from 'next/link';
import { ChevronRight, Info } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { listHrUsers } from '@/lib/firestore/users';
import { RolesList } from '@/components/admin/roles-list';

export const metadata = { title: 'Roles & Permissions' };

export default async function RolesAdminPage() {
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
    <div className="mx-auto w-full py-6">

      <nav className="flex items-center gap-1 mb-4 text-[14px] text-slate-400">
        <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-400">Admin</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-700 font-medium">Roles</span>
      </nav>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[24px] font-medium text-slate-900">Roles & permissions</h1>
          <p className="text-[14px] text-slate-500 mt-1">
            Assign roles and per-user permissions. Click any user to edit.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAEEDA] border border-[#FAC775] rounded-md text-[14px] text-[#854F0B] shrink-0">
          <Info className="h-3 w-3 shrink-0" />
          Changes propagate on next sign-in ·{' '}
          <strong className="font-medium">up to 1 hour</strong>
        </div>
      </div>

      <RolesList users={serialized} currentUid={me.uid} />
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { getHrUser } from '@/lib/firestore/users';
import { RolesForm } from '@/components/admin/roles-form';

interface Props {
  params: Promise<{ uid: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { uid } = await params;
  const u = await getHrUser(uid);
  return {
    title: u
      ? `${u.displayName ?? u.email} — Roles & Permissions`
      : 'User',
  };
}

export default async function EditUserRolesPage({ params }: Props) {
  const me = await requirePermission('manage_roles');
  const { uid } = await params;
  const target = await getHrUser(uid);
  if (!target) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roles
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {target.displayName ?? target.email}
        </h1>
        <p className="text-sm text-muted">{target.email}</p>
      </div>

      <RolesForm
        uid={target.uid}
        email={target.email}
        displayName={target.displayName}
        initialRoles={target.roles}
        initialPermissions={target.permissions}
        active={target.active}
        isSelf={target.uid === me.uid}
      />
    </div>
  );
}

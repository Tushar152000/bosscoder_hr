import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { listHrUsers } from '@/lib/firestore/users';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Roles & Permissions' };

export default async function RolesAdminPage() {
  const me = await requirePermission('manage_roles');
  const users = await listHrUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-muted">
          Assign roles and per-user permissions. Changes refresh the user&apos;s Firebase custom
          claims; they take effect on the user&apos;s next sign-in or session refresh.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All portal users</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? 'user' : 'users'} have signed in. New employees
            appear here automatically the first time they sign in with their @bosscoderacademy.com
            account.
          </CardDescription>
        </CardHeader>
        <ul className="divide-y divide-[rgb(var(--border))]">
          {users.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted">No users yet.</li>
          ) : (
            users.map((u) => {
              const isYou = u.uid === me.uid;
              return (
                <li key={u.uid}>
                  <Link
                    href={`/admin/roles/${u.uid}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-white/[0.03]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {u.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.photoURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 rounded-full"
                        />
                      ) : (
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-500/15 text-xs font-semibold text-accent-200 ring-1 ring-accent-500/30">
                          {initials(u.displayName, u.email)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {u.displayName || u.email}
                          </span>
                          {isYou && <Badge variant="brand">You</Badge>}
                          {!u.active && <Badge variant="danger">Deactivated</Badge>}
                        </div>
                        <div className="truncate text-xs text-muted">{u.email}</div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      {u.roles.length === 0 ? (
                        <Badge variant="muted">no role</Badge>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} variant={r === 'founder' ? 'brand' : 'default'}>
                            {r}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="hidden text-xs text-muted md:block">
                      {u.lastLoginAt ? `last seen ${formatDate(u.lastLoginAt)}` : 'never signed in'}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </Card>
    </div>
  );
}

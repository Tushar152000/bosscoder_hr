import Link from 'next/link';
import { Plus, Search, GitBranch } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees, getManagerSubtreeIds } from '@/lib/auth/employee-access';
import { isPrivileged } from '@/lib/auth/roles';
import { listEmployees } from '@/lib/firestore/employees';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { EmployeeStatus } from '@/types/employee';

export const metadata = { title: 'Directory' };

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: EmployeeStatus | 'any'; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params.q?.trim() || '';
  const status = params.status ?? 'active';
  const forbidden = params.error === 'forbidden';

  const all = await listEmployees({ search: q || undefined, status });

  const subtree = isPrivileged(user.roles) ? null : await getManagerSubtreeIds(user);
  const employees = all.filter((e) => {
    if (isPrivileged(user.roles)) return true;
    if (e.userUid === user.uid) return true;
    if (subtree?.has(e.employeeId)) return true;
    return e.active;
  });

  return (
    <div className="space-y-6">
      {forbidden && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You don&apos;t have permission to view that page.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Directory</h1>
          <p className="mt-1 text-sm text-muted">
            {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
            {q ? ` · search "${q}"` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/directory/tree">
              <GitBranch className="h-4 w-4" />
              Org tree
            </Link>
          </Button>
          {canEditEmployees(user) && (
            <Button asChild size="sm">
              <Link href="/directory/new">
                <Plus className="h-4 w-4" />
                New employee
              </Link>
            </Button>
          )}
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/directory">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, designation, department…"
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={status} className="w-44">
          <option value="active">Active</option>
          <option value="on-notice">On notice</option>
          <option value="left">Left</option>
          <option value="any">Any status</option>
        </Select>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-default bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  No employees yet. {canEditEmployees(user) && <Link href="/directory/new" className="text-accent-300 hover:underline">Add the first one →</Link>}
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.employeeId} className="border-t border-default hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/directory/${e.employeeId}`} className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-500/15 text-xs font-semibold text-accent-200 ring-1 ring-accent-500/30">
                        {initials(e.displayName, e.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white">{e.displayName}</div>
                        <div className="truncate text-xs text-muted">{e.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{e.designation}</td>
                  <td className="px-4 py-3">{e.department}</td>
                  <td className="px-4 py-3 text-xs capitalize text-muted">{e.employmentType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(e.joiningDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  if (status === 'active') return <Badge variant="success">Active</Badge>;
  if (status === 'on-notice') return <Badge variant="warning">On notice</Badge>;
  return <Badge variant="muted">Left</Badge>;
}

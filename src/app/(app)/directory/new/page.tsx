import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees } from '@/lib/auth/employee-access';
import { emptyEmployeeInput, listEmployees } from '@/lib/firestore/employees';
import { EmployeeForm } from '@/components/employees/employee-form';

export const metadata = { title: 'New employee' };

export default async function NewEmployeePage() {
  const user = await requireUser();
  if (!canEditEmployees(user)) redirect('/directory');

  const managers = await listEmployees({ status: 'active', limit: 500 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/directory"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New employee</h1>
        <p className="mt-1 text-sm text-muted">
          Sensitive fields (compensation, bank, identity, address) are encrypted before being
          stored. Only HR + founders with the right permissions can ever read them back.
        </p>
      </div>

      <EmployeeForm
        mode="create"
        initial={emptyEmployeeInput()}
        managers={managers.map((m) => ({
          employeeId: m.employeeId,
          displayName: m.displayName,
          designation: m.designation,
        }))}
        canEditSensitive={canEditEmployees(user)}
      />
    </div>
  );
}

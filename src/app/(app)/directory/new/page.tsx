import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees } from '@/lib/auth/employee-access';
import { isPrivileged } from '@/lib/auth/roles';
import { emptyEmployeeInput, listEmployees } from '@/lib/firestore/employees';
import { NewEmployeeForm } from '@/components/employees/new-employee-form';

export const metadata = { title: 'New employee' };

export default async function NewEmployeePage() {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) redirect('/directory');
  if (!canEditEmployees(user)) redirect('/directory');

  const managers = await listEmployees({ status: 'active', limit: 500 });

  return (
    <NewEmployeeForm
      initial={emptyEmployeeInput()}
      managers={managers.map((m) => ({
        employeeId: m.employeeId,
        displayName: m.displayName,
        designation: m.designation,
      }))}
      canEditSensitive={canEditEmployees(user)}
    />
  );
}

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees, canViewSensitiveFor } from '@/lib/auth/employee-access';
import {
  emptyEmployeeInput,
  fullToInput,
  getEmployeeById,
  getEmployeeFull,
  listEmployees,
} from '@/lib/firestore/employees';
import { writeAuditLog } from '@/lib/audit';
import { EmployeeForm } from '@/components/employees/employee-form';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const e = await getEmployeeById(id);
  return { title: e ? `Edit ${e.displayName}` : 'Edit employee' };
}

export default async function EditEmployeePage({ params }: Props) {
  const user = await requireUser();
  if (!canEditEmployees(user)) redirect('/directory');

  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const allowSensitive = await canViewSensitiveFor(user, employee);
  let initial = emptyEmployeeInput();
  if (allowSensitive) {
    const full = await getEmployeeFull(id);
    if (full) {
      initial = fullToInput(full);
      await writeAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'employee.read_sensitive',
        resource: { type: 'employee', id: employee.employeeId },
        metadata: { context: 'edit-form' },
      });
    }
  } else {
    initial = {
      ...emptyEmployeeInput(),
      displayName: employee.displayName,
      email: employee.email,
      personalEmail: employee.personalEmail,
      phone: employee.phone ?? '',
      designation: employee.designation,
      department: employee.department,
      managedDepartments: employee.managedDepartments,
      teamId: employee.teamId,
      managerId: employee.managerId,
      joiningDate: employee.joiningDate.toISOString().slice(0, 10),
      employmentType: employee.employmentType,
      status: employee.status,
      exitDate: employee.exitDate ? employee.exitDate.toISOString().slice(0, 10) : null,
      userUid: employee.userUid,
    };
  }

  const managers = await listEmployees({ status: 'active', limit: 500 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/directory/${employee.employeeId}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {employee.displayName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit employee</h1>
      </div>

      <EmployeeForm
        mode="edit"
        employeeId={employee.employeeId}
        initial={initial}
        managers={managers
          .filter((m) => m.employeeId !== employee.employeeId)
          .map((m) => ({
            employeeId: m.employeeId,
            displayName: m.displayName,
            designation: m.designation,
          }))}
        canEditSensitive={allowSensitive}
      />
    </div>
  );
}

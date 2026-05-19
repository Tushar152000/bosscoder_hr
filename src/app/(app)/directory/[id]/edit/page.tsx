import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
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
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';

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
  const avatarColor = colorForName(employee.displayName);
  const userInitials = initials(employee.displayName, employee.email);

  return (
    <div className="py-5 space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-slate-400">
        <Home size={12} />
        <Link href="/" className="hover:text-slate-600 transition">Home</Link>
        <ChevronRight size={11} />
        <Link href="/directory" className="hover:text-slate-600 transition">Directory</Link>
        <ChevronRight size={11} />
        <Link href={`/directory/${employee.employeeId}`} className="hover:text-slate-600 transition truncate max-w-[160px]">
          {employee.displayName}
        </Link>
        <ChevronRight size={11} />
        <span className="text-slate-700 font-medium">Edit</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold text-white shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {userInitials}
          </div>
          <div>
            <h1 className="text-[19px] font-semibold text-slate-900">{employee.displayName}</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {employee.designation} · {employee.department}
            </p>
          </div>
        </div>
        <Link
          href={`/directory/${employee.employeeId}`}
          className="flex items-center gap-1.5 bg-white border border-slate-200/70 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          ← Back to profile
        </Link>
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
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Home, ChevronRight, Lock, Pencil } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees, canViewEmployee, canViewSensitiveFor } from '@/lib/auth/employee-access';
import { getEmployeeById, getEmployeeFull, listEmployees } from '@/lib/firestore/employees';
import { getHrUser, listHrUsers } from '@/lib/firestore/users';
import { writeAuditLog } from '@/lib/audit';
import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { colorForName } from '@/lib/directory/colors';
import { DeactivateEmployeeButton, DeleteEmployeeButton } from '@/components/employees/employee-actions';
import type { EmployeeFull, EmployeeStatus, EmploymentType } from '@/types/employee';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const e = await getEmployeeById(id);
  return { title: e ? e.displayName : 'Employee' };
}

export default async function EmployeeDetailPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const { msg } = await searchParams;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  if (!(await canViewEmployee(user, employee))) redirect('/directory');

  let sensitive: EmployeeFull | null = null;
  if (await canViewSensitiveFor(user, employee)) {
    sensitive = await getEmployeeFull(id);
    if (sensitive) {
      await writeAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'employee.read_sensitive',
        resource: { type: 'employee', id: employee.employeeId },
      });
    }
  }

  const [manager, directReports, hrUser, allHrUsers] = await Promise.all([
    employee.managerId ? getEmployeeById(employee.managerId) : Promise.resolve(null),
    listEmployees({ managerId: employee.employeeId, status: 'any', limit: 200 }),
    employee.userUid ? getHrUser(employee.userUid) : Promise.resolve(null),
    listHrUsers(),
  ]);
  const canEdit = canEditEmployees(user);
  const avatarColor = colorForName(employee.displayName);
  const photoURL = hrUser?.photoURL ?? null;
  const reportPhotoByUid = new Map(
    allHrUsers.filter((u) => u.photoURL).map((u) => [u.uid, u.photoURL as string]),
  );

  return (
    <div className="px-6 md:px-10 py-5 space-y-5">
      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-[#A4DFC4] bg-[#E1F5EE] px-4 py-3 text-[12px] text-[#0F6E56]">
          <Pencil size={13} className="shrink-0" />
          {msg}
        </div>
      )}
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
        <Home size={12} />
        <Link href="/" className="hover:text-slate-600 transition">Home</Link>
        <ChevronRight size={11} />
        <Link href="/directory" className="hover:text-slate-600 transition">Directory</Link>
        <ChevronRight size={11} />
        <span className="text-slate-900">{employee.displayName}</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt={employee.displayName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover shrink-0 ring-2 ring-slate-100"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-[17px] font-semibold text-white shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {initials(employee.displayName, employee.email)}
              </div>
            )}
            <div>
              <h1 className="text-[18px] font-semibold text-slate-900">{employee.displayName}</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {employee.designation} · {employee.department}
              </p>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <StatusBadge status={employee.status} />
                <TypeBadge type={employee.employmentType} />
                {employee.userUid && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E6F1FB] text-[#0C447C]">
                    Portal linked
                  </span>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/directory/${employee.employeeId}/edit`}
                className="flex items-center gap-1.5 bg-white border border-slate-200/70 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Pencil size={12} />
                Edit
              </Link>
              {employee.active && (
                <DeactivateEmployeeButton
                  employeeId={employee.employeeId}
                  displayName={employee.displayName}
                />
              )}
              <DeleteEmployeeButton
                employeeId={employee.employeeId}
                displayName={employee.displayName}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        {/* Left column */}
        <div className="space-y-4">
          {/* Profile */}
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <p className="text-[13px] font-medium text-slate-900 mb-4">Profile</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <DataRow label="Work email" value={employee.email} />
              {employee.personalEmail && (
                <DataRow label="Personal email" value={employee.personalEmail} />
              )}
              <DataRow label="Phone" value={employee.phone ?? '—'} />
              <DataRow label="Joining date" value={formatDate(employee.joiningDate)} />
              {employee.dateOfBirth && (
                <DataRow label="Birthday" value={employee.dateOfBirth} />
              )}
              <DataRow
                label="Reporting manager"
                value={
                  manager ? (
                    <Link
                      href={`/directory/${manager.employeeId}`}
                      className="text-[#0C447C] hover:underline"
                    >
                      {manager.displayName}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              {employee.exitDate && (
                <DataRow label="Exit date" value={formatDate(employee.exitDate)} />
              )}
            </div>
          </div>

          {/* Sensitive section */}
          {sensitive ? (
            <SensitiveCards sensitive={sensitive} />
          ) : (
            <div className="bg-white border border-slate-200/70 rounded-xl p-5">
              <div className="flex items-center gap-3 p-4 bg-[#FAFAF7] border border-slate-200/70 rounded-lg">
                <Lock size={15} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-slate-700">
                    Sensitive fields are encrypted
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Compensation, bank, identity and address are visible to HR &amp; founders only.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Direct reports */}
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium text-slate-900">Direct reports</p>
              {directReports.length > 0 && (
                <span className="text-[11px] text-slate-400">{directReports.length}</span>
              )}
            </div>
            {directReports.length === 0 ? (
              <p className="text-[12px] text-slate-400">No direct reports.</p>
            ) : (
              <div className="space-y-0.5">
                {directReports.map((r) => {
                  const rPhoto = r.userUid ? (reportPhotoByUid.get(r.userUid) ?? null) : null;
                  return (
                  <Link
                    key={r.employeeId}
                    href={`/directory/${r.employeeId}`}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 transition group"
                  >
                    {rPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rPhoto}
                        alt={r.displayName}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                        style={{ backgroundColor: colorForName(r.displayName) }}
                      >
                        {initials(r.displayName, r.email)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-slate-900 group-hover:text-[#0C447C] transition truncate">
                        {r.displayName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{r.designation}</p>
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Managed departments */}
          {employee.managedDepartments.length > 0 && (
            <div className="bg-white border border-slate-200/70 rounded-xl p-5">
              <p className="text-[13px] font-medium text-slate-900 mb-3">Manages departments</p>
              <div className="flex flex-wrap gap-1.5">
                {employee.managedDepartments.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-1 bg-[#FAFAF7] border border-slate-200/70 rounded-md text-[11px] text-slate-700"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  if (status === 'active')
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E1F5EE] text-[#0F6E56]">
        Active
      </span>
    );
  if (status === 'on-notice')
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
        On notice
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
      Left
    </span>
  );
}

function TypeBadge({ type }: { type: EmploymentType }) {
  if (type === 'full-time')
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E6F1FB] text-[#0C447C]">
        Full-time
      </span>
    );
  if (type === 'contractor')
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
        Contractor
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEEDFE] text-[#534AB7]">
      Intern
    </span>
  );
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 text-[13px] text-slate-900">{value || '—'}</div>
    </div>
  );
}

const DECRYPTED_BADGE = (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
    Decrypted
  </span>
);

function SensitiveCards({ sensitive }: { sensitive: EmployeeFull }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] font-medium text-slate-900">Compensation</p>
          {DECRYPTED_BADGE}
        </div>
        <p className="text-[11px] text-slate-400 mb-4">This read was logged to the audit log.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DataRow
            label="Annual CTC"
            value={sensitive.compensation.ctc ? `₹${sensitive.compensation.ctc}` : '—'}
          />
          <DataRow
            label="Fixed salary"
            value={sensitive.compensation.salary ? `₹${sensitive.compensation.salary}` : '—'}
          />
          <DataRow
            label="Variable / Bonus"
            value={sensitive.compensation.bonus ? `₹${sensitive.compensation.bonus}` : '—'}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-medium text-slate-900">Bank details</p>
          {DECRYPTED_BADGE}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DataRow label="Account number" value={sensitive.bank.accountNumber ?? '—'} />
          <DataRow label="IFSC" value={sensitive.bank.ifsc ?? '—'} />
          <DataRow label="Beneficiary name" value={sensitive.bank.beneficiaryName ?? '—'} />
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-medium text-slate-900">Identity &amp; personal</p>
          {DECRYPTED_BADGE}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DataRow label="PAN" value={sensitive.identity.pan ?? '—'} />
          <DataRow label="Aadhaar (last 4)" value={sensitive.identity.aadhaar ?? '—'} />
          <DataRow label="Date of birth" value={sensitive.dob ?? '—'} />
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-medium text-slate-900">Address</p>
          {DECRYPTED_BADGE}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DataRow label="Line 1" value={sensitive.address.line1 ?? '—'} />
          {sensitive.address.line2 && (
            <DataRow label="Line 2" value={sensitive.address.line2} />
          )}
          <DataRow label="City" value={sensitive.address.city ?? '—'} />
          <DataRow label="State" value={sensitive.address.state ?? '—'} />
          <DataRow label="Pincode" value={sensitive.address.pincode ?? '—'} />
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-medium text-slate-900">Emergency contact</p>
          {DECRYPTED_BADGE}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DataRow label="Name" value={sensitive.emergencyContact.name ?? '—'} />
          <DataRow label="Phone" value={sensitive.emergencyContact.phone ?? '—'} />
        </div>
      </div>
    </div>
  );
}

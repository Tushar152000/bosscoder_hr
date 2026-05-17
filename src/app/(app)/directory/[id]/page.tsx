import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import {
  canEditEmployees,
  canViewEmployee,
  canViewSensitiveFor,
} from '@/lib/auth/employee-access';
import {
  getEmployeeById,
  getEmployeeFull,
  listEmployees,
} from '@/lib/firestore/employees';
import { writeAuditLog } from '@/lib/audit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import {
  DeactivateEmployeeButton,
  DeleteEmployeeButton,
} from '@/components/employees/employee-actions';
import type { EmployeeFull, EmployeeStatus } from '@/types/employee';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const e = await getEmployeeById(id);
  return { title: e ? e.displayName : 'Employee' };
}

export default async function EmployeeDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  if (!(await canViewEmployee(user, employee))) {
    redirect('/directory');
  }

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

  const manager = employee.managerId ? await getEmployeeById(employee.managerId) : null;
  const directReports = await listEmployees({ managerId: employee.employeeId, status: 'any', limit: 200 });

  return (
    <div className="space-y-6">
      <Link
        href="/directory"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to directory
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-500/15 text-base font-semibold text-accent-200 ring-1 ring-accent-500/30">
            {initials(employee.displayName, employee.email)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{employee.displayName}</h1>
            <p className="text-sm text-muted">
              {employee.designation} · {employee.department}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={employee.status} />
              <Badge variant="muted">{employee.employmentType}</Badge>
              {employee.userUid && <Badge variant="brand">Portal user linked</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditEmployees(user) && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/directory/${employee.employeeId}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
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
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <DataRow label="Work email" value={employee.email} />
              <DataRow label="Personal email" value={employee.personalEmail} />
              <DataRow label="Phone" value={employee.phone} />
              <DataRow label="Joining date" value={formatDate(employee.joiningDate)} />
              <DataRow
                label="Manager"
                value={
                  manager ? (
                    <Link href={`/directory/${manager.employeeId}`} className="text-accent-300 hover:underline">
                      {manager.displayName}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              <DataRow
                label="Exit date"
                value={formatDate(employee.exitDate)}
              />
            </CardBody>
          </Card>

          {sensitive ? (
            <SensitiveCards sensitive={sensitive} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Sensitive details</CardTitle>
                <CardDescription>
                  Compensation, bank, identity, and address are encrypted.{' '}
                  {employee.userUid === user.uid
                    ? 'Loading your own…'
                    : 'You don’t have permission to view them.'}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Direct reports</CardTitle>
              <CardDescription>{directReports.length} people</CardDescription>
            </CardHeader>
            <CardBody className="space-y-2">
              {directReports.length === 0 ? (
                <p className="text-sm text-muted">None.</p>
              ) : (
                directReports.map((r) => (
                  <Link
                    key={r.employeeId}
                    href={`/directory/${r.employeeId}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/[0.04]"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-500/15 text-xs font-semibold text-accent-200 ring-1 ring-accent-500/30">
                      {initials(r.displayName, r.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{r.displayName}</div>
                      <div className="truncate text-xs text-muted">{r.designation}</div>
                    </div>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  if (status === 'active') return <Badge variant="success">Active</Badge>;
  if (status === 'on-notice') return <Badge variant="warning">On notice</Badge>;
  return <Badge variant="muted">Left</Badge>;
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm">{value || '—'}</p>
    </div>
  );
}

function SensitiveCards({ sensitive }: { sensitive: EmployeeFull }) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Compensation</CardTitle>
            <Badge variant="warning">Decrypted</Badge>
          </div>
          <CardDescription>This read was logged to the audit log.</CardDescription>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <DataRow label="CTC" value={sensitive.compensation.ctc} />
          <DataRow label="Salary" value={sensitive.compensation.salary} />
          <DataRow label="Bonus" value={sensitive.compensation.bonus} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bank details</CardTitle>
            <Badge variant="warning">Decrypted</Badge>
          </div>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <DataRow label="Account number" value={sensitive.bank.accountNumber} />
          <DataRow label="IFSC" value={sensitive.bank.ifsc} />
          <DataRow label="Beneficiary name" value={sensitive.bank.beneficiaryName} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Identity & personal</CardTitle>
            <Badge variant="warning">Decrypted</Badge>
          </div>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <DataRow label="PAN" value={sensitive.identity.pan} />
          <DataRow label="Aadhaar" value={sensitive.identity.aadhaar} />
          <DataRow label="DOB" value={sensitive.dob} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Address</CardTitle>
            <Badge variant="warning">Decrypted</Badge>
          </div>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <DataRow label="Line 1" value={sensitive.address.line1} />
          <DataRow label="Line 2" value={sensitive.address.line2} />
          <DataRow label="City" value={sensitive.address.city} />
          <DataRow label="State" value={sensitive.address.state} />
          <DataRow label="Pincode" value={sensitive.address.pincode} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Emergency contact</CardTitle>
            <Badge variant="warning">Decrypted</Badge>
          </div>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <DataRow label="Name" value={sensitive.emergencyContact.name} />
          <DataRow label="Phone" value={sensitive.emergencyContact.phone} />
        </CardBody>
      </Card>
    </>
  );
}

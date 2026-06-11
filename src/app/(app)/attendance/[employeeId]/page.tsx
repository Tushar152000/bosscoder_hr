import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, CalendarCheck } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { hasAnyRole } from '@/lib/auth/roles';
import { getEmployeeById } from '@/lib/firestore/employees';
import {
  getMonthAttendance,
  getLeaveBalance,
  getPendingLeaveRequestsForTeam,
} from '../actions';
import { EmployeeView } from '../_components/EmployeeView';
import { PendingLeavesCard } from '../_components/PendingLeavesCard';

interface Props {
  params: Promise<{ employeeId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { employeeId } = await params;
  const emp = await getEmployeeById(employeeId);
  return { title: emp ? `${emp.displayName} — Attendance` : 'Attendance' };
}

export default async function EmployeeAttendancePage({ params }: Props) {
  const { employeeId } = await params;
  const user = await requireUser();

  if (!hasAnyRole(user.roles, 'manager', 'hr', 'founder')) {
    notFound();
  }

  const emp = await getEmployeeById(employeeId);
  if (!emp) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().split('T')[0];

  const [records, balance, pendingLeaves] = await Promise.all([
    getMonthAttendance(employeeId, year, month),
    getLeaveBalance(employeeId),
    getPendingLeaveRequestsForTeam([employeeId]),
  ]);

  return (
    <div>
      {/* Back nav + page header */}
      <div className="px-4 md:px-6 pt-8 pb-0 space-y-4">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Attendance
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF3FE]">
            <CalendarCheck className="h-[18px] w-[18px] text-[#0C447C]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 leading-tight">
              {emp.displayName}
            </h1>
            <p className="text-[13px] text-slate-500">
              {emp.designation} · {emp.department}
            </p>
          </div>
        </div>
      </div>

      {/* Attendance view — no check-in banner, privileged edits */}
      <EmployeeView
        employeeId={employeeId}
        employeeName={emp.displayName}
        initialRecords={records}
        balance={balance}
        initialYear={year}
        initialMonth={month}
        today={today}
      />

      {/* Pending leave requests for this employee */}
      {pendingLeaves.length > 0 && (
        <div className="px-4 md:px-6 pb-8 space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">Pending Leave Requests</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Approve or reject {emp.displayName.split(' ')[0]}&apos;s leave requests.
            </p>
          </div>
          <PendingLeavesCard initialLeaves={pendingLeaves} showEmployeeName={false} />
        </div>
      )}
    </div>
  );
}

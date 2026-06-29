import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import { canAccessAttendance } from '@/lib/attendance/access';
import { UserX } from 'lucide-react';
import {
  getMonthAttendance,
  getLeaveBalance,
  getMyLeaveRequests,
  getTeamMembers,
  getTeamMonthAttendance,
  getPendingLeaveRequestsForTeam,
} from './actions';
import {
  getAllEmployeesAttendanceToday,
  getAllLeaveBalances,
  getAllPendingLeaves,
} from '@/lib/actions/hr';
import type { EmployeeAttendanceToday, EmployeeLeaveBalance } from '@/lib/actions/hr';
import { EmployeeView } from './_components/EmployeeView';
import { ManagerTabs } from './_components/ManagerTabs';
import type { AttendanceRecord, LeaveRequest } from '@/types/attendance';

export const metadata = { title: 'Attendance' };

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default async function AttendancePage() {
  const user = await requireUser();
  const me = await getEmployeeByUserUid(user.uid);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().split('T')[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fullDate = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const weekNum = getWeekNumber(now);

  if (!me) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white px-10 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <UserX className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-zinc-800">No employee record found</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
              Your account isn&apos;t linked to an employee profile yet. Contact HR to get set up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const firstName = me.displayName.split(' ')[0];

  const isHR      = user.roles.includes('hr') || user.roles.includes('founder');

  // Staged rollout — rollout departments + their reporting managers + HR/founder (see canAccessAttendance).
  if (!(await canAccessAttendance(user.roles, me))) {
    redirect('/');
  }

  const mightManage = user.roles.includes('manager') || isHR;

  const teamMembers = mightManage ? await getTeamMembers(me.employeeId) : [];
  const hasTeam = teamMembers.length > 0;

  if (hasTeam || isHR) {
    const teamIds = teamMembers.map((e) => e.employeeId);

    const [
      records,
      balance,
      myLeaves,
      teamRecords,
      pendingLeaves,
      hrAttendance,
      hrBalances,
      hrPending,
    ] = await Promise.all([
      getMonthAttendance(me.employeeId, year, month),
      getLeaveBalance(me.employeeId),
      getMyLeaveRequests(me.employeeId),
      hasTeam ? getTeamMonthAttendance(teamIds, year, month) : Promise.resolve<AttendanceRecord[]>([]),
      hasTeam ? getPendingLeaveRequestsForTeam(teamIds)      : Promise.resolve<LeaveRequest[]>([]),
      isHR    ? getAllEmployeesAttendanceToday()              : Promise.resolve<EmployeeAttendanceToday[]>([]),
      isHR    ? getAllLeaveBalances()                         : Promise.resolve<EmployeeLeaveBalance[]>([]),
      isHR    ? getAllPendingLeaves()                         : Promise.resolve<LeaveRequest[]>([]),
    ]);

    return (
      <div className="relative overflow-hidden px-4 md:px-10">

        <ManagerTabs
          employeeId={me.employeeId}
          employeeName={me.displayName}
          initialRecords={records}
          balance={balance}
          initialLeaveRequests={myLeaves}
          initialYear={year}
          initialMonth={month}
          today={today}
          hasTeam={hasTeam}
          teamMembers={teamMembers}
          initialTeamRecords={teamRecords}
          initialPendingLeaves={pendingLeaves}
          isHR={isHR}
          currentUserEmail={user.email}
          initialHRAttendance={hrAttendance}
          initialHRBalances={hrBalances}
          initialHRPendingLeaves={hrPending}
          greeting={greeting}
          firstName={firstName}
          fullDate={fullDate}
          weekNum={weekNum}
        />
      </div>
    );
  }

  const [records, balance, myLeaves] = await Promise.all([
    getMonthAttendance(me.employeeId, year, month),
    getLeaveBalance(me.employeeId),
    getMyLeaveRequests(me.employeeId),
  ]);

  return (
    <div className='relative overflow-hidden px-4 md:px-10'>
      
      <EmployeeView
        employeeId={me.employeeId}
        employeeName={me.displayName}
        initialRecords={records}
        balance={balance}
        initialLeaveRequests={myLeaves}
        initialYear={year}
        initialMonth={month}
        today={today}
        greeting={greeting}
        firstName={firstName}
        fullDate={fullDate}
        weekNum={weekNum}
      />
    </div>
  );
}

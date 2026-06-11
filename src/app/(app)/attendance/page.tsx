import { requireUser } from '@/lib/auth/guard';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import { Calendar, UserX } from 'lucide-react';
import {
  getMonthAttendance,
  getLeaveBalance,
  getMyLeaveRequests,
  getTeamMembers,
  getTeamMonthAttendance,
  getPendingLeaveRequestsForTeam,
} from './actions';
import { EmployeeView } from './_components/EmployeeView';
import { ManagerTabs } from './_components/ManagerTabs';

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

  const pageHeader = (
    <div className="mb-6  pb-4 pt-7">
      <h1 className="text-[20px] font-semibold text-zinc-900">
        {greeting}, {firstName}
      </h1>
      <div className="mt-1 flex items-center font-medium gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-[14px] text-zinc-500">{fullDate}</span>
        <span className="mx-0.5 text-zinc-300">·</span>
        <span className="text-[14px] text-zinc-500">Week {weekNum}</span>
      </div>
    </div>
  );

  const mightManage =
    user.roles.includes('manager') ||
    user.roles.includes('hr') ||
    user.roles.includes('founder');

  const teamMembers = mightManage ? await getTeamMembers(me.employeeId) : [];
  const hasTeam = teamMembers.length > 0;

  if (hasTeam) {
    const teamIds = teamMembers.map((e) => e.employeeId);
    const [records, balance, myLeaves, teamRecords, pendingLeaves] = await Promise.all([
      getMonthAttendance(me.employeeId, year, month),
      getLeaveBalance(me.employeeId),
      getMyLeaveRequests(me.employeeId),
      getTeamMonthAttendance(teamIds, year, month),
      getPendingLeaveRequestsForTeam(teamIds),
    ]);

    return (
      <div>
        <ManagerTabs
          employeeId={me.employeeId}
          employeeName={me.displayName}
          initialRecords={records}
          balance={balance}
          initialLeaveRequests={myLeaves}
          initialYear={year}
          initialMonth={month}
          today={today}
          teamMembers={teamMembers}
          initialTeamRecords={teamRecords}
          initialPendingLeaves={pendingLeaves}
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
    <div>
      {pageHeader}
      <EmployeeView
        employeeId={me.employeeId}
        employeeName={me.displayName}
        initialRecords={records}
        balance={balance}
        initialLeaveRequests={myLeaves}
        initialYear={year}
        initialMonth={month}
        today={today}
      />
    </div>
  );
}

import { requireUser } from '@/lib/auth/guard';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import {
  getMonthAttendance,
  getAttendanceRecord,
  getLeaveBalance,
  getMyLeaveRequests,
  getTeamMembers,
  getTeamMonthAttendance,
  getPendingLeaveRequestsForTeam,
} from './actions';
import { EmployeeView } from './_components/EmployeeView';
import { ManagerTabs } from './_components/ManagerTabs';

export const metadata = { title: 'Attendance' };

function ordinal(n: number): string {
  const v = n % 100;
  const s = ['th', 'st', 'nd', 'rd'];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function AttendancePage() {
  const user = await requireUser();
  const me = await getEmployeeByUserUid(user.uid);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const displayDate = `${ordinal(now.getDate())} ${MONTH_SHORT[now.getMonth()]} ${year}`;

  if (!me) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-[14px] text-muted">
          No employee record linked to your account. Please contact HR.
        </p>
      </div>
    );
  }

  // Show manager view if user has manager role OR has actual direct reports in Firestore.
  // This handles cases where the role claim isn't set yet but the employee tree is configured.
  const mightManage =
    user.roles.includes('manager') ||
    user.roles.includes('hr') ||
    user.roles.includes('founder');

  const teamMembers = mightManage ? await getTeamMembers(me.employeeId) : [];
  const hasTeam = teamMembers.length > 0;

  if (hasTeam) {
    const teamIds = teamMembers.map((e) => e.employeeId);
    const [records, todayRecord, balance, myLeaves, teamRecords, pendingLeaves] = await Promise.all([
      getMonthAttendance(me.employeeId, year, month),
      getAttendanceRecord(me.employeeId, today),
      getLeaveBalance(me.employeeId),
      getMyLeaveRequests(me.employeeId),
      getTeamMonthAttendance(teamIds, year, month),
      getPendingLeaveRequestsForTeam(teamIds),
    ]);

    return (
      <ManagerTabs
        employeeId={me.employeeId}
        employeeName={me.displayName}
        initialRecords={records}
        todayRecord={todayRecord}
        balance={balance}
        initialLeaveRequests={myLeaves}
        initialYear={year}
        initialMonth={month}
        today={today}
        displayDate={displayDate}
        roles={user.roles}
        teamMembers={teamMembers}
        initialTeamRecords={teamRecords}
        initialPendingLeaves={pendingLeaves}
      />
    );
  }

  const [records, todayRecord, balance, myLeaves] = await Promise.all([
    getMonthAttendance(me.employeeId, year, month),
    getAttendanceRecord(me.employeeId, today),
    getLeaveBalance(me.employeeId),
    getMyLeaveRequests(me.employeeId),
  ]);

  return (
    <EmployeeView
      employeeId={me.employeeId}
      employeeName={me.displayName}
      initialRecords={records}
      todayRecord={todayRecord}
      balance={balance}
      initialLeaveRequests={myLeaves}
      initialYear={year}
      initialMonth={month}
      today={today}
      displayDate={displayDate}
      roles={user.roles}
    />
  );
}

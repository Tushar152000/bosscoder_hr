'use client';

import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { EmployeeView } from './EmployeeView';
import { TeamView } from './TeamView';
import type { AttendanceRecord, LeaveBalance, LeaveRequest } from '@/types/attendance';
import type { TeamMember } from '../actions';
import type { Role } from '@/lib/auth/roles';

interface Props {
  employeeId: string;
  employeeName: string;
  initialRecords: AttendanceRecord[];
  todayRecord: AttendanceRecord | null;
  balance: LeaveBalance;
  initialLeaveRequests: LeaveRequest[];
  initialYear: number;
  initialMonth: number;
  today: string;
  displayDate: string;
  roles: Role[];
  teamMembers: TeamMember[];
  initialTeamRecords: AttendanceRecord[];
  initialPendingLeaves: LeaveRequest[];
}

type Tab = 'my' | 'team';

export function ManagerTabs({
  employeeId,
  employeeName,
  initialRecords,
  todayRecord,
  balance,
  initialLeaveRequests,
  initialYear,
  initialMonth,
  today,
  displayDate,
  roles,
  teamMembers,
  initialTeamRecords,
  initialPendingLeaves,
}: Props) {
  const [tab, setTab] = useState<Tab>('my');

  return (
    <div>
      {/* Page header + tab bar */}
      <div className="px-4 md:px-6 pt-8 pb-0 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF3FE]">
            <CalendarCheck className="h-[18px] w-[18px] text-[#0C447C]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 leading-tight">Attendance</h1>
            <p className="text-[13px] text-slate-500">Track attendance and manage your team&apos;s leave requests.</p>
          </div>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setTab('my')}
            className={[
              'rounded-lg px-5 py-2 text-[13px] font-medium transition-all',
              tab === 'my'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            My Attendance
          </button>
          <button
            onClick={() => setTab('team')}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-medium transition-all',
              tab === 'team'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            My Team
            {initialPendingLeaves.filter((l) => l.status === 'pending').length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                {initialPendingLeaves.filter((l) => l.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === 'my' ? (
        <EmployeeView
          employeeId={employeeId}
          employeeName={employeeName}
          initialRecords={initialRecords}
          todayRecord={todayRecord}
          balance={balance}
          initialLeaveRequests={initialLeaveRequests}
          initialYear={initialYear}
          initialMonth={initialMonth}
          today={today}
          displayDate={displayDate}
          roles={roles}
          hideHeader
        />
      ) : (
        <TeamView
          teamMembers={teamMembers}
          initialTeamRecords={initialTeamRecords}
          initialPendingLeaves={initialPendingLeaves}
          initialYear={initialYear}
          initialMonth={initialMonth}
          today={today}
        />
      )}
    </div>
  );
}

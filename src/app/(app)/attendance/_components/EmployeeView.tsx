'use client';

import { useState, useTransition } from 'react';
import { CalendarCheck } from 'lucide-react';
import { TodayBanner } from './TodayBanner';
import { AttendanceCalendar } from './AttendanceCalendar';
import { AttendanceTable } from './AttendanceTable';
import { LeaveBalanceCard } from './LeaveBalanceCard';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { getMonthAttendance } from '../actions';
import type { AttendanceRecord, LeaveBalance } from '@/types/attendance';
import type { Role } from '@/lib/auth/roles';

interface Props {
  employeeId: string;
  employeeName: string;
  initialRecords: AttendanceRecord[];
  todayRecord: AttendanceRecord | null;
  balance: LeaveBalance;
  initialYear: number;
  initialMonth: number;
  today: string;
  displayDate: string;
  roles: Role[];
  hideBanner?: boolean;
  hideHeader?: boolean;
  isPrivileged?: boolean;
}

export function EmployeeView({
  employeeId,
  employeeName,
  initialRecords,
  todayRecord,
  balance,
  initialYear,
  initialMonth,
  today,
  displayDate,
  roles,
  hideBanner = false,
  hideHeader = false,
  isPrivileged = false,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isFetching, startTransition] = useTransition();

  const canEditStatus =
    isPrivileged ||
    roles.some((r): boolean => (['hr', 'founder', 'manager'] as Role[]).includes(r));

  function handleMonthChange(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      const fresh = await getMonthAttendance(employeeId, newYear, newMonth);
      setRecords(fresh);
    });
  }

  return (
    <div className="px-4 md:px-6 py-8 space-y-6">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF3FE]">
            <CalendarCheck className="h-4.5 w-4.5 text-[#0C447C]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 leading-tight">Attendance</h1>
            <p className="text-[13px] text-slate-500">Track your daily attendance and manage leave requests.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column */}
        <div className="space-y-5 min-w-0">
          {!hideBanner && (
            <TodayBanner
              employeeId={employeeId}
              todayRecord={todayRecord}
              displayDate={displayDate}
            />
          )}

          <div className={isFetching ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
            <AttendanceCalendar
              year={year}
              month={month}
              records={records}
              today={today}
              onMonthChange={handleMonthChange}
            />
          </div>

          <button
            onClick={() => setLeaveOpen(true)}
            className="rounded-xl bg-[#0C447C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0a3a6a] transition"
          >
            Apply Leave
          </button>

          <AttendanceTable
            employeeId={employeeId}
            records={records}
            year={year}
            month={month}
            canEditStatus={canEditStatus}
            onRecordsChange={setRecords}
          />
        </div>

        {/* Right column */}
        <div className="lg:sticky lg:top-6 h-fit">
          <LeaveBalanceCard balance={balance} records={records} />
        </div>
      </div>

      <ApplyLeaveModal
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        balance={balance}
      />
    </div>
  );
}

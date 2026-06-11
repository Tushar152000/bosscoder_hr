'use client';

import { useState, useTransition } from 'react';
import { Clock, Plus } from 'lucide-react';
import { AttendanceCalendar } from './AttendanceCalendar';
import { LeaveBalanceCard } from './LeaveBalanceCard';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { MyLeaveRequestsCard } from './MyLeaveRequestsCard';
import { getMonthAttendance } from '../actions';
import type { AttendanceRecord, LeaveBalance, LeaveRequest } from '@/types/attendance';

interface Props {
  employeeId: string;
  employeeName: string;
  initialRecords: AttendanceRecord[];
  balance: LeaveBalance;
  initialYear: number;
  initialMonth: number;
  today: string;
  initialLeaveRequests?: LeaveRequest[];
}

export function EmployeeView({
  employeeId,
  employeeName,
  initialRecords,
  balance,
  initialYear,
  initialMonth,
  today,
  initialLeaveRequests = [],
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isFetching, startTransition] = useTransition();

  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length;

  function handleLeaveApplied(req: LeaveRequest) {
    setLeaveRequests((prev) => [req, ...prev]);
  }

  function handleMonthChange(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      const fresh = await getMonthAttendance(employeeId, newYear, newMonth);
      setRecords(fresh);
    });
  }

  return (
    <div className="px-4 pb-8 md:px-0">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
        
        <div className="min-w-0 space-y-3">
          <div
            className={
              isFetching ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'
            }
          >
            <AttendanceCalendar
              year={year}
              month={month}
              records={records}
              today={today}
              leaveRequests={leaveRequests}
              onMonthChange={handleMonthChange}
            />
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[12px] text-amber-800">
                <span className="font-medium">
                  {pendingCount} leave request{pendingCount > 1 ? 's' : ''}
                </span>{' '}
                pending approval — shown in orange on the calendar.
              </p>
            </div>
          )}

          <button
            onClick={() => setLeaveOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2.5 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" />
            Apply for leave
          </button>
             <MyLeaveRequestsCard requests={leaveRequests} />
        </div>


        <div className="space-y-4">
          <LeaveBalanceCard balance={balance} records={records} />
       
        </div>
      </div>

      <ApplyLeaveModal
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        balance={balance}
        onApplied={handleLeaveApplied}
      />
    </div>
  );
}

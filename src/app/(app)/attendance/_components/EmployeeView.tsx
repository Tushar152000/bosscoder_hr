'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Clock, Plus, X, ChevronRight, Home } from 'lucide-react';
import { AttendanceCalendar } from './AttendanceCalendar';
import { LeaveBalanceCard } from './LeaveBalanceCard';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { MyLeaveRequestsCard } from './MyLeaveRequestsCard';
import { getMonthAttendance } from '../actions';
import type { AttendanceRecord, LeaveBalance, LeaveRequest, LeaveRequestStatus } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';

interface Props {
  employeeId: string;
  employeeName: string;
  initialRecords: AttendanceRecord[];
  balance: LeaveBalance;
  initialYear: number;
  initialMonth: number;
  today: string;
  initialLeaveRequests?: LeaveRequest[];
  greeting?: string;
  firstName?: string;
  fullDate?: string;
  weekNum?: number;
}

const STATUS_BADGE: Record<LeaveRequestStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-amber-50',  text: 'text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-green-50',  text: 'text-green-700', label: 'Approved' },
  rejected: { bg: 'bg-red-50',    text: 'text-red-600',   label: 'Rejected' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
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
  greeting,
  firstName,
  fullDate,
  weekNum,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
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

  const previewRequests = leaveRequests.slice(0, 3);
  const extraCount = leaveRequests.length - 3;

  return (
    <div className="px-4 pb-8 md:px-0">
      {/* Greeting header — flex row with the primary action on the right.
          The greeting only renders when supplied; manager / single-employee
          views pass none and just get the action button. */}
      <div
        className={[
          'mb-6 flex flex-col gap-4 sm:flex-row sm:items-center',
          greeting ? 'pt-7 sm:justify-between' : 'pt-2 sm:justify-end',
        ].join(' ')}
      >
        {greeting && (
          <div>
            <div className="flex items-center gap-1.5 text-[13px] text-slate-400 font-medium mb-1.5">
              <Home size={14} />
              <Link href="/" className="hover:text-slate-600 md:text-[16px] text-[14px] transition">
                Home
              </Link>
              <ChevronRight size={11} />
              <span className="text-slate-900 md:text-[16px] text-[14px]">Attendance</span>
            </div>
            <h1 className="text-[20px] md:text-[28px] font-semibold text-dark-blue">
              {greeting}, {firstName}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 font-medium">
              <span className="text-[14px] text-zinc-500">{fullDate}</span>
              <span className="mx-0.5 text-zinc-300">·</span>
              <span className="text-[14px] text-zinc-500">Week {weekNum}</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setLeaveOpen(true)}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0C447C] px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#0a3a6b] active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          Apply for leave
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">

        {/* Left — pending status + calendar */}
        <div className="min-w-0 space-y-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[12px] text-amber-800">
                <span className="font-semibold">
                  {pendingCount} leave request{pendingCount > 1 ? 's' : ''}
                </span>{' '}
                pending approval — shown in orange on the calendar.
              </p>
            </div>
          )}

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
        </div>

        <div className="space-y-4">
          <LeaveBalanceCard balance={balance} records={records} />

      
          <button
            onClick={() => setLeaveModalOpen(true)}
            className="w-full rounded-[10px] border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Leave Requests
              </p>
              <div className="flex items-center gap-1.5">
                {leaveRequests.length > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                    {leaveRequests.length}
                  </span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>

            {leaveRequests.length === 0 ? (
              <p className="text-[12px] text-zinc-400">No leave requests yet.</p>
            ) : (
              <div className="space-y-2.5">
                {previewRequests.map((req) => {
                  const badge = STATUS_BADGE[req.status];
                  return (
                    <div
                      key={req.id ?? req.createdAt}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-zinc-700">
                          {LEAVE_LABELS[req.leaveType]}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {fmtDate(req.fromDate)}
                          {req.fromDate !== req.toDate && ` – ${fmtDate(req.toDate)}`}
                        </p>
                      </div>
                      <span
                        className={[
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          badge.bg,
                          badge.text,
                        ].join(' ')}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <p className="text-[11px] text-zinc-400">+{extraCount} more</p>
                )}
              </div>
            )}
          </button>
        </div>
      </div>

      {leaveModalOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setLeaveModalOpen(false)}
          />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">
            <div className="relative max-h-[80vh] overflow-y-auto rounded-xl shadow-xl">
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <MyLeaveRequestsCard requests={leaveRequests} />
            </div>
          </div>
        </>
      )}

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

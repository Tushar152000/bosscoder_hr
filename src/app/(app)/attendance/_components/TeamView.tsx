'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { getTeamMonthAttendance, approveLeave, rejectLeave } from '../actions';
import type { AttendanceRecord, LeaveRequest } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';
import type { TeamMember } from '../actions';
import { AllMembersSection } from './AllMembersSection';

const AVATAR_COLORS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#EEEDFE', text: '#3C3489' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

function dayCount(from: string, to: string): number {
  return (
    Math.round(
      (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) /
        86_400_000,
    ) + 1
  );
}

interface Props {
  teamMembers: TeamMember[];
  initialTeamRecords: AttendanceRecord[];
  initialPendingLeaves: LeaveRequest[];
  initialYear: number;
  initialMonth: number;
  today: string;
}

export function TeamView({
  teamMembers,
  initialTeamRecords,
  initialPendingLeaves,
  initialYear,
  initialMonth,
  today,
}: Props) {
  const [year,        setYear]        = useState(initialYear);
  const [month,       setMonth]       = useState(initialMonth);
  const [teamRecords, setTeamRecords] = useState(initialTeamRecords);
  const [isFetching,  startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>(() =>
    initialPendingLeaves.filter((l) => l.status === 'pending'),
  );
  const [processing,   setProcessing]   = useState<string | null>(null);
  const [rejectingId,  setRejectingId]  = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function handleApprove(leaveId: string) {
    setProcessing(leaveId);
    try {
      await approveLeave(leaveId);
      setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      toast.success('Leave approved');
    } catch {
      toast.error('Failed to approve leave');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(leaveId: string) {
    setProcessing(leaveId);
    try {
      await rejectLeave(leaveId, rejectReason.trim() || undefined);
      setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      setRejectingId(null);
      setRejectReason('');
      toast.success('Leave rejected');
    } catch {
      toast.error('Failed to reject leave');
    } finally {
      setProcessing(null);
    }
  }

  const todayYear  = parseInt(today.split('-')[0]);
  const todayMonth = parseInt(today.split('-')[1]);
  const isCurrentMonth = year === todayYear && month === todayMonth;

  const memberColorIndex = new Map(teamMembers.map((m, i) => [m.employeeId, i % 4]));

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear  = year;
    if (newMonth > 12) { newMonth = 1;  newYear++; }
    if (newMonth < 1)  { newMonth = 12; newYear--; }
    if (newYear > todayYear || (newYear === todayYear && newMonth > todayMonth)) return;
    setMonth(newMonth);
    setYear(newYear);
    setExpandedId(null);
    startTransition(async () => {
      const fresh = await getTeamMonthAttendance(
        teamMembers.map((m) => m.employeeId),
        newYear,
        newMonth,
      );
      setTeamRecords(fresh);
    });
  }

  function getTodayStatus(employeeId: string) {
    return teamRecords.find((r) => r.employeeId === employeeId && r.date === today)?.status ?? null;
  }

  function getMonthHistory(employeeId: string) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return initialPendingLeaves.filter(
      (r) =>
        r.employeeId === employeeId &&
        r.status !== 'pending' &&
        (r.fromDate.startsWith(monthStr) || r.toDate.startsWith(monthStr)),
    );
  }

  function isLowAttendance(employeeId: string): boolean {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const empRecs  = teamRecords.filter(
      (r) => r.employeeId === employeeId && r.date.startsWith(monthStr),
    );
    const present = empRecs.filter((r) => r.status === 'present').length;
    const halfDay = empRecs.filter((r) => r.status === 'half-day').length;
    const absent  = empRecs.filter((r) => r.status === 'absent').length;
    const onLeave = empRecs.filter((r) => r.status === 'leave').length;
    const total   = present + halfDay + absent + onLeave;
    const pct     = total > 0 ? ((present + halfDay * 0.5) / total) * 100 : 100;
    return pct < 80;
  }

  const presentToday = teamMembers.filter((m) => {
    const s = getTodayStatus(m.employeeId);
    return s === 'present' || s === 'half-day' || s === 'wfh';
  }).length;
  const onLeaveTodayCount = teamMembers.filter(
    (m) => getTodayStatus(m.employeeId) === 'leave',
  ).length;

  const onLeaveMembers = teamMembers.filter((m) => getTodayStatus(m.employeeId) === 'leave');

  return (
    <div className={['pb-8 transition-opacity', isFetching ? 'pointer-events-none opacity-60' : ''].join(' ')}>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              onClick={() => changeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-l-lg text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="h-4 w-px bg-zinc-200" />
            <span className="min-w-[100px] px-3 text-center text-[13px] font-semibold text-zinc-800">
              {MONTHS[month - 1]} {year}
            </span>
            <div className="h-4 w-px bg-zinc-200" />
            <button
              onClick={() => changeMonth(1)}
              disabled={isCurrentMonth}
              className="flex h-8 w-8 items-center justify-center rounded-r-lg text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          {isFetching && (
            <span className="animate-pulse text-[11px] text-zinc-400">Updating…</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#888780' }} />
            {teamMembers.length} members
          </div>
          {isCurrentMonth && (
            <>
              <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#639922' }} />
                {presentToday} present
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#378ADD' }} />
                {onLeaveTodayCount} on leave
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pending leave requests */}
      {pendingLeaves.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[14px] font-semibold uppercase tracking-wide text-amber-600">
              Pending requests
            </span>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              {pendingLeaves.length}
            </span>
            <div className="flex-1 border-t border-zinc-100" />
          </div>

          {pendingLeaves.map((req) => {
            const member     = teamMembers.find((m) => m.employeeId === req.employeeId);
            const colorIdx   = member ? (teamMembers.indexOf(member) % 4) : 0;
            const color      = AVATAR_COLORS[colorIdx];
            const days       = dayCount(req.fromDate, req.toDate);
            const isThisReject = rejectingId === req.id;
            const isBusy     = processing === req.id;

            return (
              <div key={req.id ?? req.createdAt} className="mb-2 overflow-hidden rounded-xl border border-amber-100 bg-white">
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <div
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {getInitials(member?.displayName ?? req.employeeId)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-zinc-800">
                      {member?.displayName ?? req.employeeId}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {LEAVE_LABELS[req.leaveType]} · {formatDate(req.fromDate)}
                      {req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                      {' · '}{days} day{days !== 1 ? 's' : ''}
                    </p>
                    {req.reason && (
                      <p className="mt-0.5 text-[11px] italic text-zinc-400">"{req.reason}"</p>
                    )}
                    {req.attachmentUrl && (
                      <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] font-medium text-brand-blue hover:underline">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span className="truncate">{req.attachmentName ?? 'View document'}</span>
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      disabled={isBusy}
                      onClick={() => handleApprove(req.id!)}
                      className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-[12px] font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => { setRejectingId(isThisReject ? null : req.id!); setRejectReason(''); }}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {isThisReject && (
                  <div className="border-t border-zinc-100 px-3.5 py-3">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-[12px] text-zinc-700 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={isBusy}
                        onClick={() => handleReject(req.id!)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {isBusy ? 'Rejecting…' : 'Confirm reject'}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[12px] text-zinc-500 transition hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* On leave today */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-semibold uppercase tracking-wide text-brand-blue">
            On leave today
          </span>
          <span className="text-[11px] text-zinc-400">
            {onLeaveMembers.length} member{onLeaveMembers.length !== 1 ? 's' : ''}
          </span>
          <div className="flex-1 border-t border-zinc-100" />
        </div>

        {onLeaveMembers.length === 0 ? (
          <p className="py-2 text-[12px] text-zinc-400">No one is on leave today.</p>
        ) : (
          onLeaveMembers.map((member) => {
            const color      = AVATAR_COLORS[memberColorIndex.get(member.employeeId) ?? 0];
            const isExpanded = expandedId === member.employeeId;
            const history    = getMonthHistory(member.employeeId);
            const isLow      = isLowAttendance(member.employeeId);

            return (
              <div key={member.employeeId} className="mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div
                  className="flex cursor-pointer items-center gap-2.5 px-3.5 py-3"
                  onClick={() => setExpandedId(isExpanded ? null : member.employeeId)}
                >
                  <div
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {getInitials(member.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-medium text-zinc-800">{member.displayName}</span>
                      {/* {isLow && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                          Low attendance
                        </span>
                      )} */}
                    </div>
                    <p className="text-[11px] text-zinc-400">{member.designation} · {member.department}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                      className={['text-zinc-400 transition-transform duration-200', isExpanded ? 'rotate-180' : ''].join(' ')}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-100 px-3.5 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        {MONTH_FULL[month - 1]} {year} leave history
                      </span>
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] normal-case tracking-normal text-zinc-500">
                        {history.length}
                      </span>
                    </div>

                    {history.length === 0 ? (
                      <p className="py-2 text-center text-[12px] text-zinc-400">
                        No leave history for this month.
                      </p>
                    ) : (
                      history.map((req) => {
                        const days     = dayCount(req.fromDate, req.toDate);
                        const approved = req.status === 'approved';
                        return (
                          <div
                            key={req.id ?? req.createdAt}
                            className="flex items-start gap-2 border-b border-zinc-100 py-2 last:border-b-0 last:pb-0"
                          >
                            <div
                              className="mt-1 w-[2px] shrink-0 self-stretch rounded-none"
                              style={{ backgroundColor: approved ? '#639922' : '#E24B4A', minHeight: '16px' }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium text-zinc-800">
                                {LEAVE_LABELS[req.leaveType]}
                              </p>
                              <p className="mt-0.5 text-[11px] text-zinc-400">
                                {formatDate(req.fromDate)}
                                {req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                                {' · '}{days} day{days !== 1 ? 's' : ''}
                              </p>
                              {req.reason && (
                                <p className="mt-1 text-[11px] italic text-zinc-500">&ldquo;{req.reason}&rdquo;</p>
                              )}
                              {req.attachmentUrl && (
                                <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer"
                                  className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-blue transition hover:bg-zinc-100">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                  </svg>
                                  <span className="truncate">{req.attachmentName ?? 'View document'}</span>
                                </a>
                              )}
                              {!approved && req.rejectionReason && (
                                <p className="mt-1 text-[11px] text-red-500">Rejected: {req.rejectionReason}</p>
                              )}
                            </div>
                            <span className={[
                              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                              approved
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-red-200 bg-red-50 text-red-700',
                            ].join(' ')}>
                              {approved ? 'Approved' : 'Rejected'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <AllMembersSection
        teamMembers={teamMembers}
        allLeaveHistory={initialPendingLeaves.filter((l) => l.status !== 'pending')}
        teamRecords={teamRecords}
        today={today}
        year={year}
        month={month}
        isCurrentMonth={isCurrentMonth}
      />
    </div>
  );
}

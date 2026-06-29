'use client';

import { useState } from 'react';
import type { AttendanceRecord, LeaveRequest } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';
import type { TeamMember } from '../actions';

const AVATAR_COLORS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#EEEDFE', text: '#3C3489' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
  allLeaveHistory: LeaveRequest[];
  teamRecords: AttendanceRecord[];
  today: string;
  year: number;
  month: number;
  isCurrentMonth: boolean;
}

export function AllMembersSection({
  teamMembers,
  allLeaveHistory,
  teamRecords,
  today,
  year,
  month,
  isCurrentMonth,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const memberColorIndex = new Map(teamMembers.map((m, i) => [m.employeeId, i % 4]));

  function getTodayStatus(employeeId: string) {
    return teamRecords.find((r) => r.employeeId === employeeId && r.date === today)?.status ?? null;
  }

  function getAllHistory(employeeId: string) {
    return allLeaveHistory.filter((r) => r.employeeId === employeeId);
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

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[14px] font-medium uppercase tracking-wide text-zinc-400">
          All members
        </span>
        <span className="text-[11px] text-zinc-400">
          {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1 border-t border-zinc-100" />
      </div>

      {teamMembers.map((member) => {
        const color      = AVATAR_COLORS[memberColorIndex.get(member.employeeId) ?? 0];
        const todayStatus = getTodayStatus(member.employeeId);
        const isLow      = isLowAttendance(member.employeeId);
        const isExpanded = expandedId === member.employeeId;
        const history    = getAllHistory(member.employeeId);

        const statusBadge =
          todayStatus === 'present'  ? { label: 'Present',  cls: 'bg-green-50 text-green-800 border-green-200' } :
          todayStatus === 'absent'   ? { label: 'Absent',   cls: 'bg-red-50 text-red-800 border-red-200' } :
          todayStatus === 'leave'    ? { label: 'On leave', cls: 'bg-blue-50 text-blue-800 border-blue-200' } :
          todayStatus === 'half-day' ? { label: 'Half day', cls: 'bg-amber-50 text-amber-800 border-amber-200' } :
          todayStatus === 'wfh'      ? { label: 'WFH',      cls: 'bg-violet-50 text-violet-800 border-violet-200' } :
          null;

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
                {isCurrentMonth && statusBadge && (
                  <span className={['rounded-full border px-2 py-0.5 text-[11px] font-medium', statusBadge.cls].join(' ')}>
                    {statusBadge.label}
                  </span>
                )}
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
                    Leave history
                  </span>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] normal-case tracking-normal text-zinc-500">
                    {history.length}
                  </span>
                </div>

                {history.length === 0 ? (
                  <p className="py-2 text-center text-[12px] text-zinc-400">No leave history found.</p>
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
      })}
    </div>
  );
}

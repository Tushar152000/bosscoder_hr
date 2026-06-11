'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { approveLeave, rejectLeave, getTeamMonthAttendance } from '../actions';
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
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
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

function computeStats(
  employeeId: string,
  records: AttendanceRecord[],
  year: number,
  month: number,
) {
  const empRecs = records.filter((r) => r.employeeId === employeeId);
  const daysInMonth = new Date(year, month, 0).getDate();
  let totalWorkdays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) totalWorkdays++;
  }
  const present = empRecs.filter((r) => r.status === 'present').length;
  const halfDay = empRecs.filter((r) => r.status === 'half-day').length;
  const absent  = empRecs.filter((r) => r.status === 'absent').length;
  const leave   = empRecs.filter((r) => r.status === 'leave').length;
  const pct = totalWorkdays > 0
    ? Math.round(((present + halfDay * 0.5) / totalWorkdays) * 100)
    : 0;
  return { present, halfDay, absent, leave, pct };
}

function getTodayStatus(employeeId: string, records: AttendanceRecord[], today: string) {
  return records.find((r) => r.employeeId === employeeId && r.date === today)?.status ?? null;
}

interface Props {
  teamMembers: TeamMember[];
  initialTeamRecords: AttendanceRecord[];
  initialPendingLeaves: LeaveRequest[];
  initialYear: number;
  initialMonth: number;
  today: string;
}

type FilterKey = 'all' | 'leave' | 'low';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',   label: 'All' },
  { key: 'leave', label: 'On leave' },
  { key: 'low',   label: 'Low attendance' },
];

export function TeamView({
  teamMembers,
  initialTeamRecords,
  initialPendingLeaves,
  initialYear,
  initialMonth,
  today,
}: Props) {
  const router = useRouter();
  const [year,        setYear]        = useState(initialYear);
  const [month,       setMonth]       = useState(initialMonth);
  const [teamRecords, setTeamRecords] = useState(initialTeamRecords);
  const [filter,      setFilter]      = useState<FilterKey>('all');
  const [isFetching,  startTransition] = useTransition();
  const [pendingLeaves, setPendingLeaves] = useState(
    () => initialPendingLeaves.filter((l) => l.status === 'pending'),
  );
  const historyLeaves = initialPendingLeaves.filter((l) => l.status !== 'pending');

  const [processing,   setProcessing]   = useState<string | null>(null);
  const [rejectingId,  setRejectingId]  = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const todayYear  = parseInt(today.split('-')[0]);
  const todayMonth = parseInt(today.split('-')[1]);
  const isCurrentMonth = year === todayYear && month === todayMonth;

  // stable colour index: same person → same colour everywhere
  const memberColorIndex = new Map(teamMembers.map((m, i) => [m.employeeId, i % 4]));

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear  = year;
    if (newMonth > 12) { newMonth = 1;  newYear++; }
    if (newMonth < 1)  { newMonth = 12; newYear--; }
    if (newYear > todayYear || (newYear === todayYear && newMonth > todayMonth)) return;
    setMonth(newMonth);
    setYear(newYear);
    startTransition(async () => {
      const fresh = await getTeamMonthAttendance(
        teamMembers.map((m) => m.employeeId),
        newYear,
        newMonth,
      );
      setTeamRecords(fresh);
    });
  }

  async function handleApprove(id: string) {
    setProcessing(id);
    const result = await approveLeave(id);
    setProcessing(null);
    if (result.ok) {
      toast.success('Leave approved');
      setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  async function handleReject(id: string) {
    setProcessing(id);
    const result = await rejectLeave(id, rejectReason);
    setProcessing(null);
    if (result.ok) {
      toast.success('Leave rejected');
      setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } else {
      toast.error(result.error);
    }
  }

  const presentToday = teamMembers.filter((m) => {
    const s = getTodayStatus(m.employeeId, teamRecords, today);
    return s === 'present' || s === 'half-day';
  }).length;
  const onLeaveToday = teamMembers.filter(
    (m) => getTodayStatus(m.employeeId, teamRecords, today) === 'leave',
  ).length;

  const filteredMembers = teamMembers.filter((m) => {
    if (filter === 'all') return true;
    const s = getTodayStatus(m.employeeId, teamRecords, today);
    if (filter === 'leave')  return s === 'leave';
    if (filter === 'low')    return computeStats(m.employeeId, teamRecords, year, month).pct < 80;
    return true;
  });

  return (
    <div className="pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <span className="min-w-[72px] text-center text-[14px] font-medium text-zinc-800">
            {MONTHS[month - 1]} {year}
          </span>

          <button
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

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
                {onLeaveToday} on leave
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              'cursor-pointer rounded-full border px-3 py-1 text-[12px] transition-colors',
              filter === f.key
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Member cards ─────────────────────────────────────────────── */}
      <div
        className={[
          'mb-6 flex flex-col gap-2 transition-opacity',
          isFetching ? 'pointer-events-none opacity-50' : 'opacity-100',
        ].join(' ')}
      >
        {filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-[13px] text-zinc-400">No members match this filter.</p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const stats      = computeStats(member.employeeId, teamRecords, year, month);
            const todayStatus = getTodayStatus(member.employeeId, teamRecords, today);
            const color      = AVATAR_COLORS[memberColorIndex.get(member.employeeId) ?? 0];

            return (
              <div key={member.employeeId} className="rounded-xl border border-zinc-200 bg-white p-3.5">

                {/* Top row */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {getInitials(member.displayName)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[14px] font-medium text-zinc-800">
                      <span>{member.displayName}</span>
                      {stats.pct < 80 && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                          Low attendance
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-zinc-400">
                      {member.designation} · {member.department}
                    </p>
                  </div>

                  {/* Right: today badge + view */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isCurrentMonth && todayStatus && (
                      <span
                        className={[
                          'rounded-full px-2 py-1 text-[11px] font-medium',
                          todayStatus === 'present' || todayStatus === 'half-day'
                            ? 'bg-green-50 text-green-800'
                            : todayStatus === 'absent'
                            ? 'bg-red-50 text-red-800'
                            : todayStatus === 'leave'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-zinc-100 text-zinc-600',
                        ].join(' ')}
                      >
                        {todayStatus === 'present'  ? 'Present'
                          : todayStatus === 'half-day' ? 'Half day'
                          : todayStatus === 'absent'   ? 'Absent'
                          : todayStatus === 'leave'    ? 'On leave'
                          : todayStatus}
                      </span>
                    )}
                    <button
                      onClick={() => router.push(`/attendance/${member.employeeId}`)}
                      className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[12px] text-zinc-500 hover:bg-zinc-50"
                    >
                      View
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="mt-3 flex items-center gap-2.5 border-t border-zinc-100 pt-3">
                  {/* Stat mini-pills */}
                  <div className="flex flex-1 flex-wrap gap-1">
                    <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-[11px] text-green-700">{stats.present}P</span>
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">{stats.halfDay}H</span>
                    <span className="rounded-md bg-red-50   px-1.5 py-0.5 text-[11px] text-red-700"  >{stats.absent}A</span>
                    <span className="rounded-md bg-blue-50  px-1.5 py-0.5 text-[11px] text-blue-700" >{stats.leave}L</span>
                  </div>

                  {/* Attendance bar + pct */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="h-1 w-18 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${stats.pct}%`,
                          backgroundColor: stats.pct >= 80 ? '#639922' : '#E24B4A',
                        }}
                      />
                    </div>
                    <span
                      className={[
                        'min-w-[32px] text-right text-[12px] font-medium',
                        stats.pct >= 80 ? 'text-green-800' : 'text-red-700',
                      ].join(' ')}
                    >
                      {stats.pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pending requests ─────────────────────────────────────────── */}
      {pendingLeaves.length > 0 && (
        <div className="mb-6">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12px] font-medium uppercase tracking-wide text-zinc-400">
              Pending requests
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-700">
              {pendingLeaves.length} pending
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {pendingLeaves.map((leave) => {
              const days      = dayCount(leave.fromDate, leave.toDate);
              const busy      = processing === leave.id;
              const isReject  = rejectingId === leave.id;

              return (
                <div key={leave.id} className="rounded-xl border border-zinc-200 bg-white p-3.5">
                  {/* Info row */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8"  y1="2" x2="8"  y2="6" />
                        <line x1="3"  y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-zinc-800">{leave.employeeName}</p>
                      <p className="mt-0.5 text-[12px] text-zinc-400">
                        {LEAVE_LABELS[leave.leaveType]} · {days} day{days !== 1 ? 's' : ''} · {formatDate(leave.fromDate)}
                        {leave.fromDate !== leave.toDate && ` – ${formatDate(leave.toDate)}`}
                      </p>
                      {leave.reason && (
                        <p className="mt-1.5 rounded-md bg-zinc-50 px-2 py-1.5 text-[12px] italic text-zinc-400">
                          {leave.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3">
                    <button
                      onClick={() => handleApprove(leave.id!)}
                      disabled={busy}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 py-1.5 text-[12px] font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {busy && !isReject ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        if (isReject) { setRejectingId(null); setRejectReason(''); }
                        else { setRejectingId(leave.id!); setRejectReason(''); }
                      }}
                      disabled={busy}
                      className={[
                        'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50',
                        isReject
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700',
                      ].join(' ')}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6"  y1="6" x2="18" y2="18" />
                      </svg>
                      {isReject ? 'Cancel' : 'Reject'}
                    </button>
                  </div>

                  {/* Rejection input */}
                  {isReject && (
                    <div className="mt-2 flex gap-2 rounded-lg border border-red-100 bg-red-50 p-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        autoFocus
                        className="w-full flex-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-[12px] text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-red-300 focus:ring-1 focus:ring-red-100"
                      />
                      <button
                        onClick={() => handleReject(leave.id!)}
                        disabled={busy}
                        className="shrink-0 rounded-md border border-red-200 bg-white px-3 py-1.5 text-[12px] font-medium text-red-600 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busy ? 'Rejecting…' : 'Confirm'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leave history ─────────────────────────────────────────────── */}
      {historyLeaves.length > 0 && (
        <div>
          <div className="mb-2.5">
            <span className="text-[12px] font-medium uppercase tracking-wide text-zinc-400">
              Leave history
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {historyLeaves.map((req) => {
              const days  = dayCount(req.fromDate, req.toDate);
              const color = AVATAR_COLORS[memberColorIndex.get(req.employeeId) ?? 0];

              return (
                <div
                  key={req.id ?? req.createdAt}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5"
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {getInitials(req.employeeName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-zinc-800">{req.employeeName}</p>
                    <p className="text-[11px] text-zinc-400">
                      {LEAVE_LABELS[req.leaveType]} · {days} day{days !== 1 ? 's' : ''} · {formatDate(req.fromDate)}
                      {req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                    </p>
                  </div>

                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      req.status === 'approved'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700',
                    ].join(' ')}
                  >
                    {req.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Users, Clock, AlertTriangle } from 'lucide-react';
import { PendingLeavesCard } from './PendingLeavesCard';
import { getTeamMonthAttendance } from '../actions';
import type { AttendanceRecord, LeaveRequest } from '@/types/attendance';
import type { TeamMember } from '../actions';

interface Props {
  teamMembers: TeamMember[];
  initialTeamRecords: AttendanceRecord[];
  initialPendingLeaves: LeaveRequest[];
  initialYear: number;
  initialMonth: number;
  today: string;
}

type FilterKey = 'all' | 'absent' | 'leave' | 'low';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
  const absent = empRecs.filter((r) => r.status === 'absent').length;
  const leave = empRecs.filter((r) => r.status === 'leave').length;
  const pct =
    totalWorkdays > 0
      ? Math.round(((present + halfDay * 0.5) / totalWorkdays) * 100)
      : 0;
  return { present, halfDay, absent, leave, totalWorkdays, pct };
}

function getTodayStatus(
  employeeId: string,
  records: AttendanceRecord[],
  today: string,
) {
  return records.find((r) => r.employeeId === employeeId && r.date === today)?.status ?? null;
}

export function TeamView({
  teamMembers,
  initialTeamRecords,
  initialPendingLeaves,
  initialYear,
  initialMonth,
  today,
}: Props) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [teamRecords, setTeamRecords] = useState(initialTeamRecords);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isFetching, startTransition] = useTransition();

  const todayYear = parseInt(today.split('-')[0]);
  const todayMonth = parseInt(today.split('-')[1]);

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
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

  const isCurrentMonth = year === todayYear && month === todayMonth;

  // Stat cards
  const presentToday = teamMembers.filter((m) => {
    const s = getTodayStatus(m.employeeId, teamRecords, today);
    return s === 'present' || s === 'half-day';
  }).length;
  const onLeaveToday = teamMembers.filter(
    (m) => getTodayStatus(m.employeeId, teamRecords, today) === 'leave',
  ).length;

  // Filtered members
  const filteredMembers = teamMembers.filter((m) => {
    if (filter === 'all') return true;
    const todayStatus = getTodayStatus(m.employeeId, teamRecords, today);
    if (filter === 'absent') return todayStatus === 'absent';
    if (filter === 'leave') return todayStatus === 'leave';
    if (filter === 'low') return computeStats(m.employeeId, teamRecords, year, month).pct < 80;
    return true;
  });

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'absent', label: 'Absent today' },
    { key: 'leave', label: 'On leave' },
    { key: 'low', label: 'Low attendance' },
  ];

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      {/* Month picker + stat cards */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[90px] text-center text-[14px] font-semibold text-slate-800">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {isFetching && (
            <span className="text-[11px] text-slate-400 animate-pulse">Updating…</span>
          )}
        </div>

        {/* Stat chips */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 shadow-sm">
            <Users className="h-3.5 w-3.5 text-[#0C447C]" />
            <span className="text-[12px] font-semibold text-slate-700">{teamMembers.length}</span>
            <span className="text-[11px] text-slate-400">members</span>
          </div>
          {isCurrentMonth && (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-emerald-50 px-3 py-1.5 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-semibold text-emerald-700">{presentToday}</span>
                <span className="text-[11px] text-emerald-600">present</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-amber-50 px-3 py-1.5 shadow-sm">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[12px] font-semibold text-amber-700">{onLeaveToday}</span>
                <span className="text-[11px] text-amber-600">on leave</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              'rounded-full px-3.5 py-1 text-[12px] font-medium transition border',
              filter === f.key
                ? 'bg-[#0C447C] text-white border-[#0C447C]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Team member cards */}
      <div
        className={[
          'space-y-3 transition-opacity',
          isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100',
        ].join(' ')}
      >
        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
            <p className="text-[13px] text-slate-400">No members match this filter.</p>
          </div>
        ) : (
          filteredMembers.map((member, idx) => {
            const stats = computeStats(member.employeeId, teamRecords, year, month);
            const todayStatus = getTodayStatus(member.employeeId, teamRecords, today);
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const pctColor =
              stats.pct >= 90
                ? 'bg-emerald-500'
                : stats.pct >= 75
                ? 'bg-amber-400'
                : 'bg-red-400';

            return (
              <div
                key={member.employeeId}
                className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold',
                      color.bg,
                      color.text,
                    ].join(' ')}
                  >
                    {getInitials(member.displayName)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-[14px] font-semibold text-slate-800">{member.displayName}</p>
                        <p className="text-[11px] text-slate-400">{member.designation} · {member.department}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Today status tag */}
                        {isCurrentMonth && todayStatus && (
                          <span
                            className={[
                              'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                              todayStatus === 'present'
                                ? 'bg-emerald-50 text-emerald-700'
                                : todayStatus === 'half-day'
                                ? 'bg-amber-50 text-amber-700'
                                : todayStatus === 'absent'
                                ? 'bg-red-50 text-red-600'
                                : todayStatus === 'leave'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-500',
                            ].join(' ')}
                          >
                            {todayStatus === 'present'
                              ? 'Present'
                              : todayStatus === 'half-day'
                              ? 'Half Day'
                              : todayStatus === 'absent'
                              ? 'Absent'
                              : todayStatus === 'leave'
                              ? 'On Leave'
                              : todayStatus}
                          </span>
                        )}
                        {stats.pct < 80 && (
                          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Low
                          </span>
                        )}
                        <button
                          onClick={() => router.push(`/attendance/${member.employeeId}`)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">
                          {stats.present}P · {stats.halfDay}H · {stats.absent}A · {stats.leave}L
                        </span>
                        <span className={['font-semibold', stats.pct >= 80 ? 'text-slate-700' : 'text-red-500'].join(' ')}>
                          {stats.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={['h-full rounded-full transition-all', pctColor].join(' ')}
                          style={{ width: `${stats.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending leaves */}
      {initialPendingLeaves.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">Pending Leave Requests</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Review and approve or reject pending requests.</p>
          </div>
          <PendingLeavesCard initialLeaves={initialPendingLeaves} showEmployeeName />
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { STATUS_DISPLAY } from '@/types/attendance';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => 2023 + i);

interface StatusStyle {
  dot: string;
  bg: string;
}

const STATUS_STYLES: Partial<Record<AttendanceStatus, StatusStyle>> = {
  present:    { dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
  absent:     { dot: 'bg-red-500',     bg: 'bg-red-50' },
  'half-day': { dot: 'bg-amber-400',   bg: 'bg-amber-50' },
  leave:      { dot: 'bg-blue-500',    bg: 'bg-blue-50' },
  pending:    { dot: 'bg-slate-400',   bg: '' },
};

interface Props {
  year: number;
  month: number;
  records: AttendanceRecord[];
  today: string;
  onMonthChange: (year: number, month: number) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AttendanceCalendar({ year, month, records, today, onMonthChange }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const recordByDate = new Map(records.map((r) => [r.date, r]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const cells: Array<string | null> = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${year}-${pad(month)}-${pad(i + 1)}`
    ),
  ];

  const todayDate = new Date();
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth() + 1;
  const canGoNext = year < currentYear || (year === currentYear && month < currentMonth);

  function prevMonth() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (!canGoNext) return;
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  function handleDayClick(dateStr: string) {
    if (!recordByDate.get(dateStr) || dateStr > today) return;
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }

  const selectedRecord = selectedDate ? recordByDate.get(selectedDate) ?? null : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <select
            value={month}
            onChange={(e) => onMonthChange(year, Number(e.target.value))}
            className="bg-transparent text-[13px] font-semibold text-slate-700 outline-none cursor-pointer ml-1"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onMonthChange(Number(e.target.value), month)}
            className="bg-transparent text-[13px] font-semibold text-slate-700 outline-none cursor-pointer"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => onMonthChange(currentYear, currentMonth)}
          className="rounded-lg border border-slate-200 px-3 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Today
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1 text-[11px] font-semibold text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={`blank-${idx}`} />;

          const record = recordByDate.get(dateStr);
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          const dayNum = new Date(dateStr + 'T00:00:00').getDate();
          const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const status = record?.status ?? (isWeekend ? 'weekend' : null);
          const style = status ? STATUS_STYLES[status] : null;
          const isSelected = selectedDate === dateStr;
          const isClickable = !!record && !isFuture;

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className={cn(
                'mx-0.5 my-0.5 flex flex-col items-center rounded-lg py-1.5 transition',
                isClickable && 'cursor-pointer hover:ring-1 hover:ring-slate-300',
                isFuture && 'opacity-30',
                !isFuture && style?.bg,
                isToday && 'ring-2 ring-[#0C447C]/30',
                isSelected && 'ring-2 ring-[#0C447C]/50',
              )}
            >
              <span
                className={cn(
                  'text-[12px] font-medium',
                  isWeekend ? 'text-slate-400' : 'text-slate-700',
                  status === 'holiday' && 'text-slate-400',
                  isToday && 'font-bold text-[#0C447C]',
                )}
              >
                {dayNum}
              </span>
              {status === 'holiday' ? (
                <span className="mt-0.5 text-[9px] text-slate-400">H</span>
              ) : style?.dot ? (
                <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', style.dot)} />
              ) : (
                <span className="mt-0.5 h-1.5 w-1.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedRecord && selectedDate && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-slate-700">
              {formatDisplayDate(selectedDate)}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-slate-400">Status</span>
            <span className="font-medium text-slate-700">{STATUS_DISPLAY[selectedRecord.status]}</span>
            <span className="text-slate-400">Check In</span>
            <span className="text-slate-600">{formatTime(selectedRecord.checkIn)}</span>
            <span className="text-slate-400">Check Out</span>
            <span className="text-slate-600">{formatTime(selectedRecord.checkOut)}</span>
            <span className="text-slate-400">Duration</span>
            <span className="text-slate-600">{formatDuration(selectedRecord.duration)}</span>
          </div>
          {selectedRecord.remarks && (
            <p className="border-t border-slate-200 pt-1.5 text-[11px] text-slate-500">
              {selectedRecord.remarks}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
        {[
          { label: 'Present',  dot: 'bg-emerald-500' },
          { label: 'Absent',   dot: 'bg-red-500' },
          { label: 'Half-day', dot: 'bg-amber-400' },
          { label: 'Leave',    dot: 'bg-blue-500' },
        ].map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', dot)} />
            <span className="text-[11px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

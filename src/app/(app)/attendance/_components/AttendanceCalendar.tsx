'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceRecord, AttendanceStatus, LeaveRequest } from '@/types/attendance';
import { STATUS_DISPLAY, LEAVE_LABELS } from '@/types/attendance';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface StatusStyle {
  dot: string;
}

const STATUS_STYLES: Partial<Record<AttendanceStatus, StatusStyle>> = {
  present:    { dot: 'bg-green-500' },
  absent:     { dot: 'bg-red-500' },
  'half-day': { dot: 'bg-amber-400' },
  leave:      { dot: 'bg-blue-500' },
  wfh:        { dot: 'bg-violet-500' },
};

/** Pill colours for the day-detail popup, per status. */
const STATUS_CHIP: Partial<Record<AttendanceStatus, string>> = {
  present:    'bg-green-50 text-green-700 ring-green-200',
  absent:     'bg-red-50 text-red-600 ring-red-200',
  'half-day': 'bg-amber-50 text-amber-700 ring-amber-200',
  leave:      'bg-sky-50 text-sky-700 ring-sky-200',
  wfh:        'bg-violet-50 text-violet-700 ring-violet-200',
  holiday:    'bg-zinc-100 text-zinc-600 ring-zinc-200',
};

interface Props {
  year: number;
  month: number;
  records: AttendanceRecord[];
  today: string;
  leaveRequests?: LeaveRequest[];
  onMonthChange: (year: number, month: number) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AttendanceCalendar({
  year,
  month,
  records,
  today,
  leaveRequests = [],
  onMonthChange,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  const recordByDate = new Map(records.map((r) => [r.date, r]));

  const pendingLeaveByDate = new Map<string, LeaveRequest>();
  for (const req of leaveRequests.filter((r) => r.status === 'pending')) {
    const cur = new Date(req.fromDate + 'T00:00:00');
    const end = new Date(req.toDate + 'T00:00:00');
    while (cur <= end) {
      const d = cur.toISOString().split('T')[0];
      if (!pendingLeaveByDate.has(d)) pendingLeaveByDate.set(d, req);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const cells: Array<string | null> = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
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
    const hasRecord = !!recordByDate.get(dateStr);
    const hasPending = pendingLeaveByDate.has(dateStr);
    if (!hasRecord && !hasPending) return;
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }

  const selectedRecord = selectedDate ? recordByDate.get(selectedDate) ?? null : null;
  const selectedPendingLeave = selectedDate ? pendingLeaveByDate.get(selectedDate) ?? null : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">

      {/* Nav row */}
      <div className="mb-4 flex items-center justify-between gap-2">

        {/* Left: arrows + month-year picker trigger */}
        <div className="relative flex items-center gap-0.5">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => { setPickerYear(year); setPickerOpen((v) => !v); }}
            className="ml-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition hover:bg-zinc-100"
          >
            <span className="text-[14px] font-semibold text-dark-blue">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-zinc-400 transition-transform duration-150',
                pickerOpen && 'rotate-180',
              )}
            />
          </button>

   
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl">
                {/* Year nav */}
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[13px] font-semibold text-zinc-800">{pickerYear}</span>
                  <button
                    onClick={() => setPickerYear((y) => Math.min(y + 1, currentYear))}
                    disabled={pickerYear >= currentYear}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1">
                  {MONTH_SHORT.map((name, i) => {
                    const m = i + 1;
                    const isActive = pickerYear === year && m === month;
                    const isFutureMonth =
                      pickerYear > currentYear ||
                      (pickerYear === currentYear && m > currentMonth);
                    return (
                      <button
                        key={m}
                        disabled={isFutureMonth}
                        onClick={() => { onMonthChange(pickerYear, m); setPickerOpen(false); }}
                        className={cn(
                          'rounded-[8px] py-2  text-[12px] font-medium transition flex justify-center items-center',
                          isActive
                            ? 'bg-zinc-400 text-white'
                            : !isFutureMonth
                            ? 'text-zinc-700 hover:bg-zinc-100'
                            : 'cursor-not-allowed text-zinc-300',
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Today button */}
        <button
          onClick={() => { onMonthChange(currentYear, currentMonth); setPickerOpen(false); }}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          Today
        </button>
      </div>

    
      <div className="mb-0.5 grid grid-cols-7">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="flex h-8 items-center justify-center text-[12px] font-semibold uppercase tracking-wide text-zinc-400">
            {d}
          </div>
        ))}
      </div>

    
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={`blank-${idx}`} className="h-10" />;

          const record = recordByDate.get(dateStr);
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          const dayNum = new Date(dateStr + 'T00:00:00').getDate();
          const status = record?.status ?? null;
          const style = status ? STATUS_STYLES[status] : null;
          const isPendingLeave = !record && pendingLeaveByDate.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isClickable = !!record || isPendingLeave;

         
          const cellBg = !isFuture
            ? isPendingLeave
              ? 'bg-orange-50 hover:bg-orange-100'
              : status === 'present'
              ? 'bg-green-50 hover:bg-green-100'
              : status === 'absent'
              ? 'bg-red-50 hover:bg-red-100'
              : status === 'half-day'
              ? 'bg-amber-50 hover:bg-amber-100'
              : status === 'leave'
              ? 'bg-sky-50 hover:bg-sky-100'
              : status === 'wfh'
              ? 'bg-violet-50 hover:bg-violet-100'
              : isClickable
              ? 'hover:bg-zinc-50'
              : ''
            : '';

    
          const numColor = isPendingLeave
            ? 'text-orange-700 font-medium'
            : status === 'present'
            ? 'text-green-700'
            : status === 'absent'
            ? 'text-red-600'
            : status === 'half-day'
            ? 'text-amber-700'
            : status === 'leave'
            ? 'text-blue-700'
            : status === 'wfh'
            ? 'text-violet-700'
            : 'text-zinc-500';

          return (
            <div
              key={dateStr}
              onClick={() => (isClickable ? handleDayClick(dateStr) : undefined)}
              className={cn(
                'group relative flex flex-col py-2 items-center justify-center gap-2 rounded-[8px] transition',
                isClickable && 'cursor-pointer',
                isFuture && !isPendingLeave && 'opacity-30',
                !isSelected && cellBg,
                isSelected && 'ring-1 ring-inset ring-zinc-900/20 bg-zinc-100',
              )}
            >
              {isClickable && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  Click to see the reason
                </span>
              )}

              <span
                className={cn(
                  'flex h-[40px] w-[40px] items-center justify-center rounded-full text-[14px] md:text-[16px] transition',
                  isToday
                    ? 'bg-gradient-to-br from-[#0C447C] to-[#2E73C4] font-semibold text-white shadow-sm'
                    : `font-semibold ${numColor}`,
                )}
              >
                {dayNum}
              </span>

              {/* Status indicator */}
              {isPendingLeave ? (
                <span className="h-[5px] w-[5px] rounded-full bg-orange-400" />
              ) : status === 'leave' ? (
                <span className="text-[8px] md:text-[10px] font-semibold uppercase leading-none tracking-wide text-sky-400">
                  Leave
                </span>
              ) : status === 'wfh' ? (
                <span className="text-[8px] md:text-[10px] font-semibold uppercase leading-none tracking-wide text-violet-400">
                  WFH
                </span>
              ) : status === 'half-day' ? (
                <span className="text-[8px] md:text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-500">
                  Half day
                </span>
              ) : style?.dot ? (
                <span className={cn('h-[5px] w-[5px] rounded-full', style.dot)} />
              ) : (
                <span className="h-[5px] w-[5px]" />
              )}
            </div>
          );
        })}
      </div>

  
      {selectedDate && selectedRecord && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-zinc-700">
                {formatDisplayDate(selectedDate)}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1',
                  STATUS_CHIP[selectedRecord.status] ?? 'bg-zinc-100 text-zinc-600 ring-zinc-200',
                )}
              >
                {STATUS_DISPLAY[selectedRecord.status]}
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded p-0.5 text-zinc-400 transition hover:bg-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {selectedRecord.remarks ? (
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-400">Reason: </span>
              {selectedRecord.remarks.replace(/^(Leave|WFH):\s*/, '') || '—'}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-400">No remarks.</p>
          )}
        </div>
      )}

      {/* Pending leave popup */}
      {selectedDate && !selectedRecord && selectedPendingLeave && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-amber-800">
                {formatDisplayDate(selectedDate)}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Pending
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded p-0.5 text-amber-400 transition hover:bg-amber-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1 text-[12px]">
            <div>
              <span className="text-amber-600/80">Leave type: </span>
              <span className="font-medium text-amber-800">
                {LEAVE_LABELS[selectedPendingLeave.leaveType]}
              </span>
            </div>
            <div>
              <span className="text-amber-600/80">Date range: </span>
              <span className="text-amber-800">
                {formatDisplayDate(selectedPendingLeave.fromDate)}
                {selectedPendingLeave.fromDate !== selectedPendingLeave.toDate &&
                  ` – ${formatDisplayDate(selectedPendingLeave.toDate)}`}
              </span>
            </div>
            {selectedPendingLeave.reason && (
              <div>
                <span className="text-amber-600/80">Reason: </span>
                <span className="text-amber-800">{selectedPendingLeave.reason}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-100 pt-3">
        {[
          { label: 'Leave',         dot: 'bg-sky-500' },
          { label: 'Half-day',      dot: 'bg-amber-400' },
          { label: 'WFH',           dot: 'bg-violet-500' },
          { label: 'Pending leave', dot: 'bg-orange-500' },
        ].map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', dot)} />
            <span className="text-[11px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { checkInOut } from '../actions';
import type { AttendanceRecord } from '@/types/attendance';

interface Props {
  employeeId: string;
  todayRecord: AttendanceRecord | null;
  displayDate: string;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function TodayBanner({ employeeId, todayRecord: initial, displayDate }: Props) {
  const [record, setRecord] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return null;

  const checkedIn = !!record?.checkIn;
  const checkedOut = !!record?.checkOut;

  function handleClick() {
    startTransition(async () => {
      const result = await checkInOut(employeeId);
      if (result.ok) {
        setRecord(result.data);
        toast.success(result.data.checkOut ? 'Checked out successfully' : 'Checked in successfully');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 flex items-center justify-between gap-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-slate-800">
          Mark attendance for today ({displayDate})
        </p>
        {!checkedIn && (
          <p className="mt-0.5 text-[12px] text-slate-500">
            You can mark your attendance for today.
          </p>
        )}
        {checkedIn && !checkedOut && (
          <p className="mt-0.5 text-[12px] text-slate-500">
            Checked in at {formatTime(record!.checkIn)}
          </p>
        )}
        {checkedOut && (
          <p className="mt-0.5 text-[12px] text-slate-500">
            {formatTime(record!.checkIn)} → {formatTime(record!.checkOut)}
            {record!.duration > 0 && ` · ${formatDuration(record!.duration)}`}
          </p>
        )}
      </div>

      {!checkedOut && (
        <button
          onClick={handleClick}
          disabled={isPending}
          className={[
            'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition disabled:opacity-60',
            checkedIn
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-[#0C447C] hover:bg-[#0a3a6a]',
          ].join(' ')}
        >
          <Clock className="h-3.5 w-3.5" />
          {isPending ? '...' : checkedIn ? 'Check Out' : 'Check In'}
        </button>
      )}
    </div>
  );
}

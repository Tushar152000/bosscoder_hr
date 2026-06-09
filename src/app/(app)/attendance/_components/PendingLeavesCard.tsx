'use client';

import { useState } from 'react';
import { Check, X, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { approveLeave, rejectLeave } from '../actions';
import type { LeaveRequest } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';

interface Props {
  initialLeaves: LeaveRequest[];
  showEmployeeName?: boolean;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function dayCount(from: string, to: string): number {
  const diff = new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime();
  return Math.round(diff / 86_400_000) + 1;
}

export function PendingLeavesCard({ initialLeaves, showEmployeeName = true }: Props) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [processing, setProcessing] = useState<string | null>(null);

  if (leaves.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm text-center">
        <p className="text-[13px] text-slate-400">No pending leave requests</p>
      </div>
    );
  }

  async function handleApprove(id: string) {
    setProcessing(id);
    const result = await approveLeave(id);
    setProcessing(null);
    if (result.ok) {
      toast.success('Leave approved');
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  async function handleReject(id: string) {
    setProcessing(id);
    const result = await rejectLeave(id);
    setProcessing(null);
    if (result.ok) {
      toast.success('Leave rejected');
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
      {leaves.map((leave, i) => {
        const days = dayCount(leave.fromDate, leave.toDate);
        const busy = processing === leave.id;
        return (
          <div
            key={leave.id}
            className={[
              'flex items-start gap-3 px-4 py-3.5',
              i < leaves.length - 1 ? 'border-b border-slate-100' : '',
            ].join(' ')}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>

            <div className="min-w-0 flex-1">
              {showEmployeeName && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <User className="h-3 w-3 text-slate-400" />
                  <span className="text-[12px] font-semibold text-slate-700">{leave.employeeName}</span>
                </div>
              )}
              <p className="text-[13px] font-medium text-slate-800">
                {LEAVE_LABELS[leave.leaveType]}
                <span className="ml-2 text-[11px] font-normal text-slate-400">
                  {days} day{days !== 1 ? 's' : ''}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {formatDate(leave.fromDate)}
                {leave.fromDate !== leave.toDate && ` — ${formatDate(leave.toDate)}`}
              </p>
              {leave.reason && (
                <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{leave.reason}</p>
              )}
            </div>

            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => handleApprove(leave.id!)}
                disabled={busy}
                title="Approve"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleReject(leave.id!)}
                disabled={busy}
                title="Reject"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

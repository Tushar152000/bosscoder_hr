'use client';

import { useState } from 'react';
import { Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, User } from 'lucide-react';
import type { LeaveRequest, LeaveRequestStatus } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';

interface Props {
  requests: LeaveRequest[];
  showEmployeeName?: boolean;
  title?: string;
}

const STATUS_CONFIG: Record<
  LeaveRequestStatus,
  { label: string; bg: string; text: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50',
    text: 'text-red-600',
    icon: <XCircle className="h-3 w-3" />,
  },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

function dayCount(from: string, to: string): number {
  return Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000,
  ) + 1;
}

const SHOW_LIMIT = 3;

export function MyLeaveRequestsCard({ requests, showEmployeeName = false, title = 'Leave Requests' }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? requests : requests.slice(0, SHOW_LIMIT);
  const hasMore = requests.length > SHOW_LIMIT;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-slate-800">{title}</h3>
        {requests.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {requests.length}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <p className="px-4 pb-4 text-[12px] text-slate-400">No leave requests yet.</p>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {visible.map((req) => {
              const cfg = STATUS_CONFIG[req.status];
              const days = dayCount(req.fromDate, req.toDate);
              return (
                <div key={req.id ?? req.createdAt} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {showEmployeeName && req.employeeName && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="text-[12px] font-semibold text-slate-700">{req.employeeName}</span>
                        </div>
                      )}
                      <p className="text-[13px] font-medium text-slate-800 truncate">
                        {LEAVE_LABELS[req.leaveType]}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatDate(req.fromDate)}
                        {req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                        <span className="text-slate-400"> · {days}d</span>
                      </p>
                      {req.reason && (
                        <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">{req.reason}</p>
                      )}
                      {req.status === 'rejected' && req.rejectionReason && (
                        <p className="mt-1.5 rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-600">
                          <span className="font-medium">Reason: </span>{req.rejectionReason}
                        </p>
                      )}
                    </div>
                    <span
                      className={[
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        cfg.bg,
                        cfg.text,
                      ].join(' ')}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-2.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition"
            >
              {expanded ? (
                <><ChevronUp className="h-3 w-3" /> Show less</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> {requests.length - SHOW_LIMIT} more</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

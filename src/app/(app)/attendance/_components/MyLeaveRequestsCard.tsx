'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import type { LeaveRequest, LeaveRequestStatus } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';

interface Props {
  requests: LeaveRequest[];
  showEmployeeName?: boolean;
  title?: string;
}

const STATUS_BADGE: Record<LeaveRequestStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-amber-50',  text: 'text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-green-50',  text: 'text-green-700', label: 'Approved' },
  rejected: { bg: 'bg-red-50',    text: 'text-red-600',   label: 'Rejected' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

const SHOW_LIMIT = 5;

export function MyLeaveRequestsCard({
  requests,
  showEmployeeName = false,
  title = 'Leave requests',
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? requests : requests.slice(0, SHOW_LIMIT);
  const hasMore = requests.length > SHOW_LIMIT;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{title}</p>
        {requests.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
            {requests.length}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <p className="text-[12px] text-zinc-400">No leave requests yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((req) => {
              const badge = STATUS_BADGE[req.status];
              const days = dayCount(req.fromDate, req.toDate);
              return (
                <div
                  key={req.id ?? req.createdAt}
                  className="flex items-start justify-between rounded-lg border border-zinc-100 px-3 py-2"
                >
                  <div className="mr-2 min-w-0 flex-1">
                    {showEmployeeName && req.employeeName && (
                      <div className="mb-0.5 flex items-center gap-1">
                        <User className="h-3 w-3 text-zinc-400" />
                        <span className="text-[11px] font-medium text-zinc-600">
                          {req.employeeName}
                        </span>
                      </div>
                    )}
                    <p className="truncate text-[12px] font-medium text-zinc-800">
                      {LEAVE_LABELS[req.leaveType]}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {formatDate(req.fromDate)}
                      {req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                      {' · '}
                      {days}d
                    </p>
                    {req.status === 'rejected' && req.rejectionReason && (
                      <p className="mt-1 text-[11px] italic text-zinc-400">{req.rejectionReason}</p>
                    )}
                  </div>
                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      badge.bg,
                      badge.text,
                    ].join(' ')}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-700"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Show {requests.length - SHOW_LIMIT} more
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

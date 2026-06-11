import type { LeaveRequest } from '@/types/attendance';
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
  historyLeaves: LeaveRequest[];
  teamMembers: TeamMember[];
}

export function LeaveHistorySection({ historyLeaves, teamMembers }: Props) {
  if (historyLeaves.length === 0) return null;

  const memberColorIndex = new Map(teamMembers.map((m, i) => [m.employeeId, i % 4]));

  const grouped = teamMembers
    .map((member) => ({
      member,
      leaves: historyLeaves.filter((r) => r.employeeId === member.employeeId),
    }))
    .filter(({ leaves }) => leaves.length > 0);

  return (
    <div>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <span className="md:text-[18px] text-[16px] font-semibold text-zinc-700">Leave History</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[12px] font-medium text-zinc-500">
          {historyLeaves.length}
        </span>
      </div>

      {/* Grouped by person */}
      <div className="flex flex-col gap-3">
        {grouped.map(({ member, leaves }) => {
          const color = AVATAR_COLORS[memberColorIndex.get(member.employeeId) ?? 0];

          return (
            <div key={member.employeeId} className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">

              {/* Person header */}
              <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-3.5 py-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {getInitials(member.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-zinc-800">{member.displayName}</p>
                  <p className="text-[11px] text-zinc-400">
                    {leaves.length} request{leaves.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Leave rows */}
              {leaves.map((req, i) => {
                const days     = dayCount(req.fromDate, req.toDate);
                const approved = req.status === 'approved';

                return (
                  <div
                    key={req.id ?? req.createdAt}
                    className={i < leaves.length - 1 ? 'border-b border-zinc-100' : ''}
                  >
                    <div className="flex items-stretch bg-white">
                      {/* Status stripe */}
                      <div
                        className="w-[3px] shrink-0"
                        style={{ backgroundColor: approved ? '#22c55e' : '#ef4444' }}
                      />
                      {/* Row content */}
                      <div className="flex flex-1 items-center gap-2.5 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-zinc-700">
                            {LEAVE_LABELS[req.leaveType]}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-400">
                            {formatDate(req.fromDate)}
                            {req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                            <span className="mx-1 text-zinc-300">·</span>
                            {days} day{days !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span
                          className={[
                            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            approved
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-red-200 bg-red-50 text-red-700',
                          ].join(' ')}
                        >
                          {approved ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {!approved && req.rejectionReason && (
                      <div className="bg-red-50/50 px-4 py-1.5 text-[11px] italic text-zinc-500">
                        &ldquo;{req.rejectionReason}&rdquo;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

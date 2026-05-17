import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  MANAGER_RATING_KEYS,
  MANAGER_RATING_LABELS,
  type ReviewSubmission,
} from '@/types/review';

export function ManagerRatingTable({
  submissions,
  cycleStatus,
}: {
  submissions: ReviewSubmission[];
  cycleStatus: 'draft' | 'open' | 'closed';
}) {
  const rows = submissions.filter((s) => s.kind === 'manager');

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-[13px] text-slate-500">
        No manager-eval entries{' '}
        {cycleStatus === 'draft' ? '— open the cycle to assign reviews.' : 'available.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-card">
      <table className="w-full min-w-[720px] text-left">
        <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[10px] font-medium uppercase tracking-[0.5px] text-slate-400">
          <tr>
            <th className="px-4 py-2.5">Employee</th>
            <th className="px-4 py-2.5">Department</th>
            <th className="px-4 py-2.5">Reviewer</th>
            {MANAGER_RATING_KEYS.map((k) => (
              <th key={k} className="px-3 py-2.5 text-center">
                {MANAGER_RATING_LABELS[k]}
              </th>
            ))}
            <th className="px-4 py-2.5 text-center">Overall</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const ratings = s.managerRatings;
            const overall = s.managerOverallRating;
            return (
              <tr
                key={s.submissionId}
                className="border-t border-[#E2E8F0] transition hover:bg-[#F8FAFC]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/performance/submissions/${s.submissionId}`}
                    className="text-[13px] font-medium text-slate-900 hover:text-[#0C447C] hover:underline"
                  >
                    {s.subjectName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[12px] text-slate-500">{s.subjectDepartment}</td>
                <td className="px-4 py-3 text-[12px] text-slate-700">{s.reviewerName}</td>
                {MANAGER_RATING_KEYS.map((k) => (
                  <td key={k} className="px-3 py-3 text-center text-[13px] tabular-nums text-slate-700">
                    {ratings ? ratings[k].toFixed(1) : '—'}
                  </td>
                ))}
                <td className="px-4 py-3 text-center">
                  {overall != null ? (
                    <span
                      className={cn(
                        'text-[14px] font-semibold tabular-nums',
                        overall <= 2
                          ? 'text-[#0F6E56]'
                          : overall <= 3
                          ? 'text-slate-900'
                          : overall <= 4
                          ? 'text-[#854F0B]'
                          : 'text-[#993C1D]',
                      )}
                    >
                      {overall.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[13px] text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={s.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: ReviewSubmission['status'] }) {
  const map: Record<ReviewSubmission['status'], { label: string; cls: string }> = {
    submitted:     { label: 'Submitted',   cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
    'in-progress': { label: 'In progress', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
    'not-started': { label: 'Not started', cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]' },
    locked:        { label: 'Locked',      cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

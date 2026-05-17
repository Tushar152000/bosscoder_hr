import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  MANAGER_RATING_KEYS,
  MANAGER_RATING_LABELS,
  type ReviewSubmission,
} from '@/types/review';

/**
 * Server component — admin view of all manager-eval rows for a cycle.
 * Sortable will come later; for now ordered by department + name.
 */
export function ManagerRatingTable({
  submissions,
  cycleStatus,
}: {
  submissions: ReviewSubmission[];
  cycleStatus: 'draft' | 'open' | 'closed';
}) {
  const managerSubs = submissions.filter((s) => s.kind === 'manager');

  if (managerSubs.length === 0) {
    return (
      <p className="text-sm text-muted">
        No manager-eval entries{' '}
        {cycleStatus === 'draft' ? 'yet — open the cycle to assign reviews.' : 'available.'}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-default bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Reviewer</th>
            {MANAGER_RATING_KEYS.map((k) => (
              <th key={k} className="px-3 py-3 text-center">
                {MANAGER_RATING_LABELS[k]}
              </th>
            ))}
            <th className="px-4 py-3 text-center">Overall</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {managerSubs.map((s) => {
            const ratings = s.managerRatings;
            const overall = s.managerOverallRating;
            return (
              <tr key={s.submissionId} className="border-t border-default hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/performance/submissions/${s.submissionId}`} className="hover:underline">
                    {s.subjectName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{s.subjectDepartment}</td>
                <td className="px-4 py-3 text-xs">{s.reviewerName}</td>
                {MANAGER_RATING_KEYS.map((k) => (
                  <td key={k} className="px-3 py-3 text-center text-sm tabular-nums">
                    {ratings ? ratings[k].toFixed(1) : '—'}
                  </td>
                ))}
                <td
                  className={cn(
                    'px-4 py-3 text-center text-base tabular-nums font-bold',
                    overall == null
                      ? 'text-muted'
                      : overall <= 2
                      ? 'text-emerald-300'
                      : overall <= 3
                      ? 'text-white'
                      : overall <= 4
                      ? 'text-amber-300'
                      : 'text-red-300'
                  )}
                >
                  {overall != null ? overall.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-3 text-xs">
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
  const map: Record<ReviewSubmission['status'], { label: string; className: string }> = {
    'not-started': { label: 'Not started', className: 'bg-white/10 text-white ring-1 ring-white/10' },
    'in-progress': { label: 'In progress', className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' },
    submitted: { label: 'Submitted', className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' },
    locked: { label: 'Locked', className: 'bg-white/5 text-muted ring-1 ring-white/10' },
  };
  const { label, className } = map[status];
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  );
}

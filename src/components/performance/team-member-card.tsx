import Link from 'next/link';
import { ArrowRight, Clock, UserCheck, Check } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission, SubmissionStatus } from '@/types/review';

export interface TeamPair {
  managerEval: ReviewSubmission;
  selfEval: ReviewSubmission | null;
}

const AVATAR_COLORS = [
  'bg-[#EBF3FE] text-[#0C447C]',
  'bg-[#E1F5EE] text-[#0F6E56]',
  'bg-[#EEEDFE] text-[#534AB7]',
  'bg-[#FAEEDA] text-[#854F0B]',
  'bg-[#FAECE7] text-[#993C1D]',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function TeamMemberCard({ pair }: { pair: TeamPair }) {
  const { managerEval: me, selfEval } = pair;
  const myEvalFinal = me.status === 'submitted' || me.status === 'locked';
  const selfSubmitted = selfEval?.status === 'submitted' || selfEval?.status === 'locked';

  // Derive combined status for the status pill
  const pairStatus: 'pending' | 'awaiting-self' | 'completed' = myEvalFinal
    ? 'completed'
    : selfSubmitted
    ? 'awaiting-self'
    : 'pending';

  const ctaLabel = myEvalFinal
    ? 'View answers'
    : selfSubmitted
    ? 'Review'
    : 'Fill evaluation';

  const ctaHref = `/performance/submissions/${me.submissionId}`;

  return (
    <Link
      href={ctaHref}
      className="group flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card transition hover:border-[#CBD5E1] hover:shadow-card-hover"
    >
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-medium',
            avatarColor(me.subjectName),
          )}
        >
          {initials(me.subjectName, me.subjectEmail)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-slate-900">{me.subjectName}</p>
          <p className="truncate text-[11px] text-slate-500">{me.subjectDepartment}</p>
        </div>
        <PairStatusPill status={pairStatus} />
      </div>

      {/* Rating row when completed */}
      {myEvalFinal && me.managerOverallRating != null && (
        <div className="flex items-center gap-2 border-t border-[#E2E8F0] pt-2 text-[11px]">
          <span className="text-slate-500">Rating</span>
          <span className="font-semibold tabular-nums text-slate-900">
            {me.managerOverallRating.toFixed(2)}
          </span>
          {me.submittedAt && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">{formatDate(me.submittedAt)}</span>
            </>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-end text-[12px] font-medium text-[#0C447C] transition group-hover:translate-x-0.5">
        {ctaLabel}
        <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function PairStatusPill({ status }: { status: 'pending' | 'awaiting-self' | 'completed' }) {
  if (status === 'completed')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-medium text-[#0F6E56]">
        <Check className="h-2.5 w-2.5" />
        Done
      </span>
    );
  if (status === 'awaiting-self')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3FE] px-2 py-0.5 text-[10px] font-medium text-[#0C447C]">
        <UserCheck className="h-2.5 w-2.5" />
        Ready to review
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-medium text-[#854F0B]">
      <Clock className="h-2.5 w-2.5" />
      Pending
    </span>
  );
}

// Kept for backward compat — used by team-ratings-list
export function submissionStatusLabel(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    submitted: 'Submitted',
    'in-progress': 'In progress',
    'not-started': 'Not started',
    locked: 'Locked',
  };
  return map[status];
}

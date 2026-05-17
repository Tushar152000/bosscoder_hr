import Link from 'next/link';
import { ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission } from '@/types/review';

export function YourSelfEvalCard({ submission }: { submission: ReviewSubmission }) {
  const final = submission.status === 'submitted' || submission.status === 'locked';
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-card">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5 border-b border-[#E2E8F0] pb-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#EBF3FE]">
          <User className="h-[15px] w-[15px] text-[#0C447C]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-slate-900">Your self-evaluation</p>
          <p className="text-[11px] text-slate-500">Reflect on your work this period.</p>
        </div>
        <StatusPill status={submission.status} />
      </div>

      {/* Body row */}
      <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
        <p className="text-[12px] text-slate-600">
          {final && submission.submittedAt
            ? `Submitted ${formatDate(submission.submittedAt)} — view only.`
            : 'Reflect on the past month and share what mattered. Submission is final.'}
        </p>
        <Button asChild variant={final ? 'secondary' : 'primary'} size="sm" className="ml-3 shrink-0">
          <Link href={`/performance/submissions/${submission.submissionId}`}>
            {final ? 'View answers' : 'Fill self-evaluation'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import {
  canEditSubmission,
  canViewSubmission,
} from '@/lib/auth/review-access';
import {
  findSelfEvalForCycleAndSubject,
  getSubmission,
} from '@/lib/firestore/review-submissions';
import {
  emptyManagerEvalInput,
  emptySelfEvalInput,
  type ManagerEvalInput,
  type SelfEvalInput,
} from '@/types/review';
import { SelfEvalForm } from '@/components/performance/self-eval-form';
import { SelfEvalReadOnly } from '@/components/performance/self-eval-readonly';
import { ManagerEvalForm } from '@/components/performance/manager-eval-form';
import { writeAuditLog } from '@/lib/audit';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}

export const metadata = { title: 'Review form' };

export default async function SubmissionPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const sub = await getSubmission(id, { decryptNotes: true });
  if (!sub) notFound();

  const backHref = sp?.from ?? '/performance';

  if (!(await canViewSubmission(user, sub))) {
    redirect('/performance');
  }
  const editable = await canEditSubmission(user, sub);

  if (sub.kind === 'manager' && sub.managerNotes) {
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'review.read',
      resource: { type: 'review_submission', id: sub.submissionId },
      metadata: { kind: 'manager', subject: sub.subjectEmployeeId },
    });
  }

  if (sub.kind === 'self') {
    const initial: SelfEvalInput = sub.selfAnswers
      ? { answers: { ...emptySelfEvalInput().answers, ...sub.selfAnswers } }
      : emptySelfEvalInput();

    return (
      <SelfEvalForm
        submissionId={sub.submissionId}
        cycleId={sub.cycleId}
        cycleName={sub.cycleName}
        subjectName={sub.subjectName}
        subjectDepartment={sub.subjectDepartment}
        initial={initial}
        status={sub.status}
        submittedAt={sub.submittedAt}
        canEdit={editable}
      />
    );
  }

  const initial: ManagerEvalInput = sub.managerRatings
    ? {
        ratings: sub.managerRatings,
        notes: sub.managerNotes,
      }
    : emptyManagerEvalInput();

  const pairedSelfEval = await findSelfEvalForCycleAndSubject(
    sub.cycleId,
    sub.subjectEmployeeId
  );

  const selfEvalSubmitted = pairedSelfEval?.status === 'submitted';

  return (
    <div className="mx-auto max-w-[1300px] py-6 space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {'Back to evaluations'}
      </Link>

      <SelfEvalReadOnly selfEval={pairedSelfEval} subjectName={sub.subjectName} />

      <ManagerEvalForm
        submissionId={sub.submissionId}
        cycleName={sub.cycleName}
        subjectName={sub.subjectName}
        subjectDepartment={sub.subjectDepartment}
        initial={initial}
        status={sub.status}
        submittedAt={sub.submittedAt}
        canEdit={editable}
        selfEvalSubmitted={selfEvalSubmitted}
      />
    </div>
  );
}

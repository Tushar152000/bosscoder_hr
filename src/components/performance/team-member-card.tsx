import Link from 'next/link';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { initials, cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission, SubmissionStatus } from '@/types/review';

export interface TeamPair {
  /** The manager-eval form THIS user fills for the subject. */
  managerEval: ReviewSubmission;
  /** The subject's own self-evaluation, if it was generated. */
  selfEval: ReviewSubmission | null;
}

/**
 * One card per direct report. Shows the report's self-eval status (read-only,
 * viewable once submitted) and the manager's own evaluation form (fillable
 * until submitted, then view-only).
 */
export function TeamMemberCard({ pair }: { pair: TeamPair }) {
  const { managerEval: me, selfEval } = pair;
  const subjectFinal = selfEval?.status === 'submitted' || selfEval?.status === 'locked';
  const myEvalFinal = me.status === 'submitted' || me.status === 'locked';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-500/15 text-sm font-semibold text-accent-200 ring-1 ring-accent-500/30">
            {initials(me.subjectName, me.subjectEmail)}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>{me.subjectName}</CardTitle>
            <CardDescription>{me.subjectDepartment}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardBody className="divide-y divide-[rgb(var(--border))]">
        <Row
          label="Their self-evaluation"
          status={selfEval?.status ?? null}
          submittedAt={selfEval?.submittedAt ?? null}
          action={
            selfEval && subjectFinal ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/performance/submissions/${selfEval.submissionId}`}>View</Link>
              </Button>
            ) : selfEval ? (
              <span className="text-xs text-muted">Waiting on them to submit</span>
            ) : (
              <span className="text-xs text-muted">Not assigned</span>
            )
          }
        />
        <Row
          label="Your evaluation of them"
          status={me.status}
          submittedAt={me.submittedAt}
          highlight
          action={
            <Button asChild size="sm" variant={myEvalFinal ? 'outline' : 'default'}>
              <Link href={`/performance/submissions/${me.submissionId}`}>
                {myEvalFinal ? 'View' : 'Fill'}
              </Link>
            </Button>
          }
        />
      </CardBody>
    </Card>
  );
}

function Row({
  label,
  status,
  submittedAt,
  action,
  highlight,
}: {
  label: string;
  status: SubmissionStatus | null;
  submittedAt: Date | null;
  action: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-3',
        highlight && 'rounded-md bg-brand-50/40 px-2'
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">
          {status ? <StatusLabel status={status} /> : 'Not assigned'}
          {status === 'submitted' && submittedAt && <> · {formatDate(submittedAt)}</>}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function StatusLabel({ status }: { status: SubmissionStatus }) {
  if (status === 'submitted') return <Badge variant="success">Submitted</Badge>;
  if (status === 'in-progress') return <Badge variant="warning">In progress</Badge>;
  if (status === 'locked') return <Badge variant="muted">Locked</Badge>;
  return <Badge variant="default">Not started</Badge>;
}

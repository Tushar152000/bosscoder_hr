import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import {
  SELF_EVAL_QUESTION_KEYS,
  SELF_EVAL_QUESTION_LABELS,
  type ReviewSubmission,
} from '@/types/review';

interface Props {
  /** The matching self-eval submission, if it exists. */
  selfEval: ReviewSubmission | null;
  /** Subject's name (for the header — falls back to selfEval.subjectName). */
  subjectName?: string;
}

/**
 * Read-only render of the employee's self-evaluation answers — used at the top
 * of the manager-eval page so the manager has the employee's reflection in
 * front of them while they fill the rating.
 */
export function SelfEvalReadOnly({ selfEval, subjectName }: Props) {
  if (!selfEval) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Self-evaluation</CardTitle>
          <CardDescription>
            {subjectName ?? 'The employee'} hasn&apos;t been assigned a self-eval for
            this cycle.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isFinal = selfEval.status === 'submitted' || selfEval.status === 'locked';
  const answers = selfEval.selfAnswers;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Self-evaluation by {selfEval.subjectName}
          </CardTitle>
          <StatusPill status={selfEval.status} />
        </div>
        <CardDescription>
          {isFinal && selfEval.submittedAt
            ? `Submitted on ${formatDate(selfEval.submittedAt)}.`
            : 'Not yet submitted — answers may still change.'}
        </CardDescription>
      </CardHeader>
      <CardBody>
        {!answers || !isFinal ? (
          <p className="text-sm text-muted">
            {answers
              ? 'Draft in progress — wait for the employee to submit before relying on these answers.'
              : 'No answers yet.'}
          </p>
        ) : (
          <ol className="space-y-5">
            {SELF_EVAL_QUESTION_KEYS.map((key, i) => {
              const value = answers[key] ?? '';
              return (
                <li key={key}>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Q{i + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {SELF_EVAL_QUESTION_LABELS[key]}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap rounded-md border border-default bg-card-elevated px-3 py-2 text-sm leading-relaxed">
                    {value || <span className="italic text-muted">(left blank)</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function StatusPill({ status }: { status: ReviewSubmission['status'] }) {
  if (status === 'submitted') return <Badge variant="success">Submitted</Badge>;
  if (status === 'locked') return <Badge variant="muted">Locked</Badge>;
  if (status === 'in-progress') return <Badge variant="warning">In progress</Badge>;
  return <Badge variant="default">Not started</Badge>;
}

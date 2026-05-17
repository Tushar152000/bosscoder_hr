'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDialog } from '@/components/ui/modal';
import { saveSelfEvalAction } from '@/app/(app)/performance/actions';
import { formatDate } from '@/lib/format';
import {
  SELF_EVAL_QUESTION_KEYS,
  SELF_EVAL_QUESTION_LABELS,
  type SelfEvalInput,
  type SubmissionStatus,
} from '@/types/review';

interface Props {
  submissionId: string;
  cycleName: string;
  subjectName: string;
  subjectDepartment: string;
  initial: SelfEvalInput;
  status: SubmissionStatus;
  submittedAt: Date | null;
  /** false → read-only mode (admin viewing someone else's form, etc.). */
  canEdit: boolean;
}

export function SelfEvalForm({
  submissionId,
  cycleName,
  subjectName,
  subjectDepartment,
  initial,
  status,
  submittedAt,
  canEdit,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<SelfEvalInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const { confirm, dialog } = useDialog();

  const isFinal = status === 'submitted' || status === 'locked';
  const readOnly = isFinal || !canEdit;

  function setAnswer<K extends keyof SelfEvalInput['answers']>(
    key: K,
    value: SelfEvalInput['answers'][K]
  ) {
    setForm((f) => ({ ...f, answers: { ...f.answers, [key]: value } }));
  }

  function save(submit: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await saveSelfEvalAction({ submissionId, input: form, submit });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(new Date().toISOString());
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!readOnly) save(true);
      }}
      className="space-y-6"
    >
      {dialog}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Self-evaluation · {cycleName}</CardTitle>
            <StatusBadge status={status} />
          </div>
          <CardDescription>
            {subjectName} · {subjectDepartment}
            {status === 'submitted' && submittedAt && (
              <> · submitted {formatDate(submittedAt)}</>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {isFinal && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {status === 'submitted'
            ? 'This form was submitted and is now final. It cannot be edited again.'
            : 'This cycle is closed. The form is read-only.'}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reflection</CardTitle>
          <CardDescription>
            Be specific — concrete contributions, blockers, and next month&apos;s plan.
            Once you submit, the form becomes final.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-5">
          {SELF_EVAL_QUESTION_KEYS.map((key, i) => (
            <Field key={key} label={`${i + 1}. ${SELF_EVAL_QUESTION_LABELS[key]}`} required>
              <Textarea
                rows={5}
                value={form.answers[key]}
                onChange={(e) => setAnswer(key, e.target.value)}
                disabled={readOnly}
                required
              />
            </Field>
          ))}
        </CardBody>
      </Card>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-2 border-t border-default bg-card px-6 py-3">
          <p className="text-xs text-muted">
            {savedAt
              ? 'Draft saved.'
              : 'Drafts save when you click "Save draft". Submission is final.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => save(false)}
              disabled={pending}
            >
              {pending ? 'Saving…' : 'Save draft'}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Submit this form?',
                  body: 'Once submitted, you cannot make further changes. Your manager will be able to view your responses.',
                  confirmLabel: 'Submit (final)',
                });
                if (ok) save(true);
              }}
              disabled={pending}
            >
              {pending ? 'Submitting…' : 'Submit (final)'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === 'submitted') return <Badge variant="success">Submitted</Badge>;
  if (status === 'locked') return <Badge variant="muted">Locked</Badge>;
  if (status === 'in-progress') return <Badge variant="warning">In progress</Badge>;
  return <Badge variant="default">Not started</Badge>;
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDialog } from '@/components/ui/modal';
import { RatingInput } from '@/components/performance/rating-input';
import { saveManagerEvalAction } from '@/app/(app)/performance/actions';
import { formatDate } from '@/lib/format';
import {
  computeManagerOverall,
  MANAGER_RATING_KEYS,
  MANAGER_RATING_LABELS,
  type ManagerEvalInput,
  type ManagerEvalRatings,
  type SubmissionStatus,
} from '@/types/review';

interface Props {
  submissionId: string;
  cycleName: string;
  subjectName: string;
  subjectDepartment: string;
  initial: ManagerEvalInput;
  status: SubmissionStatus;
  submittedAt: Date | null;
  canEdit: boolean;
}

export function ManagerEvalForm({
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
  const [form, setForm] = useState<ManagerEvalInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useDialog();

  const isFinal = status === 'submitted' || status === 'locked';
  const readOnly = isFinal || !canEdit;

  const overall = useMemo(() => computeManagerOverall(form.ratings), [form.ratings]);

  function setRating<K extends keyof ManagerEvalRatings>(key: K, value: number) {
    setForm((f) => ({ ...f, ratings: { ...f.ratings, [key]: value } }));
  }

  function save(submit: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await saveManagerEvalAction({ submissionId, input: form, submit });
      if (!res.ok) {
        setError(res.error);
        return;
      }
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
            <CardTitle>Manager evaluation · {cycleName}</CardTitle>
            <StatusBadge status={status} />
          </div>
          <CardDescription>
            Reviewing <span className="font-medium text-white">{subjectName}</span> ·{' '}
            {subjectDepartment}
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
            ? 'This evaluation was submitted and is now final. It cannot be edited again.'
            : 'This cycle is closed. The form is read-only.'}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ratings</CardTitle>
          <CardDescription>
            1 = best · 5 = worst · decimals allowed. Overall is calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-5">
          {MANAGER_RATING_KEYS.map((key) => (
            <Field key={key} label={MANAGER_RATING_LABELS[key]}>
              <RatingInput
                value={form.ratings[key]}
                onChange={(n) => setRating(key, n)}
                disabled={readOnly}
              />
            </Field>
          ))}

          <div className="rounded-md border-2 border-[#0C447C]-200 bg-[#0C447C]-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0C447C]-900">Overall Rating</span>
              <span className="text-2xl font-bold text-[#0C447C]-700">{overall.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-[#0C447C]-900/70">
              Auto-computed average of the five ratings above.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes (optional)</CardTitle>
          <CardDescription>Encrypted at rest. Visible to admins and you.</CardDescription>
        </CardHeader>
        <CardBody>
          <Textarea
            rows={4}
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            placeholder="Specific examples, growth areas, or context for the rating…"
            disabled={readOnly}
          />
        </CardBody>
      </Card>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-2 border-t border-default bg-card px-6 py-3">
          <p className="text-xs text-muted">
            Drafts save when you click &quot;Save draft&quot;. Submission is final.
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
                  title: 'Submit this evaluation?',
                  body: `Once submitted, you cannot make further changes to ${subjectName}'s rating.`,
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

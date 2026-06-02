'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Lock, Pencil, Send } from 'lucide-react';
import { useDialog } from '@/components/ui/modal';
import { RatingInput } from '@/components/performance/rating-input';
import { saveManagerEvalAction } from '@/app/(app)/performance/actions';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
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
  selfEvalSubmitted: boolean;
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
  selfEvalSubmitted,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ManagerEvalInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useDialog();

  const isFinal = status === 'submitted' || status === 'locked';
  const blockedBySelfEval = !selfEvalSubmitted && !isFinal;
  const readOnly = isFinal || !canEdit || blockedBySelfEval;

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
      if (submit) {
        router.push('/performance');
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!readOnly) save(true);
      }}
      className="space-y-4"
    >
      {dialog}

      {/* Header card */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-slate-700">
              Manager evaluation · {cycleName}
            </p>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Reviewing <span className="font-medium text-slate-700">{subjectName}</span>
              {' '}· {subjectDepartment}
              {status === 'submitted' && submittedAt && (
                <> · submitted {formatDate(submittedAt)}</>
              )}
            </p>
          </div>
          <StatusPill status={status} />
        </div>
      </div>

      {/* Status banners */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
          {error}
        </div>
      )}
      {status === 'submitted' && (
        <div className="rounded-xl border border-[#A4DFC4] bg-[#E1F5EE] px-4 py-3 flex items-center gap-2 text-[12px] text-[#0F6E56]">
          <Check size={14} className="shrink-0" />
          This evaluation is submitted and final — it cannot be edited again.
        </div>
      )}
      {status === 'locked' && (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 flex items-center gap-2 text-[12px] text-slate-500">
          <Lock size={14} className="shrink-0" />
          This cycle is closed. The form is read-only.
        </div>
      )}
      {blockedBySelfEval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2 text-[12px] text-amber-700">
          <Clock size={14} className="shrink-0" />
          {subjectName} hasn&apos;t submitted their self-evaluation yet. You can fill in ratings but cannot submit until they do.
        </div>
      )}

      {/* Ratings card */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <p className="text-[13px] font-semibold text-slate-700">Ratings</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            1 = best · 5 = worst · decimals allowed. Overall is calculated automatically.
          </p>
        </div>
        <div className="px-5 py-4 space-y-5">
          {MANAGER_RATING_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-700">
                {MANAGER_RATING_LABELS[key]}
              </label>
              <RatingInput
                value={form.ratings[key]}
                onChange={(n) => setRating(key, n)}
                disabled={readOnly}
              />
            </div>
          ))}

          {/* Overall */}
          <div className={cn(
            'rounded-xl border-2 px-4 py-3 flex items-center justify-between',
            overall <= 2
              ? 'border-[#A4DFC4] bg-[#E1F5EE]'
              : overall <= 3
              ? 'border-[#CBD5E1] bg-[#F8FAFC]'
              : overall <= 4
              ? 'border-[#FAC775] bg-[#FAEEDA]'
              : 'border-[#F4A48A] bg-[#FDEDE8]'
          )}>
            <div>
              <p className="text-[12px] font-semibold text-slate-700">Overall Rating</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Auto-computed average of the five ratings above.</p>
            </div>
            <span className={cn(
              'text-[28px] font-bold tabular-nums leading-none',
              overall <= 2
                ? 'text-[#0F6E56]'
                : overall <= 3
                ? 'text-slate-700'
                : overall <= 4
                ? 'text-[#854F0B]'
                : 'text-[#993C1D]'
            )}>
              {overall.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes card */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <p className="text-[13px] font-semibold text-slate-700">Notes <span className="font-normal text-slate-400">(optional)</span></p>
          <p className="text-[12px] text-slate-400 mt-0.5">Encrypted at rest. Visible to admins and you.</p>
        </div>
        <div className="px-5 py-4">
          <textarea
            rows={4}
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            placeholder="Specific examples, growth areas, or context for the rating…"
            disabled={readOnly}
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 focus:border-[#0C447C] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Footer action bar */}
      {!readOnly && (
        <div className="sticky bottom-0 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Drafts save when you click &quot;Save draft&quot;. Submission is final.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-[12px] font-medium text-slate-700 hover:bg-[#F8FAFC] transition disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save draft'}
            </button>
            <button
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C447C] px-3.5 py-2 text-[12px] font-medium text-white hover:bg-[#0a3a6a] transition disabled:opacity-50"
            >
              <Send size={13} />
              {pending ? 'Submitting…' : 'Submit (final)'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function StatusPill({ status }: { status: SubmissionStatus }) {
  const map = {
    submitted:     { label: 'Submitted',   cls: 'bg-[#E1F5EE] text-[#0F6E56]',                        icon: <Check size={10} /> },
    'in-progress': { label: 'In progress', cls: 'bg-[#FAEEDA] text-[#854F0B]',                        icon: <Pencil size={10} /> },
    'not-started': { label: 'Not started', cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]', icon: <Clock size={10} /> },
    locked:        { label: 'Locked',      cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]', icon: <Lock size={10} /> },
  } as const;
  const { label, cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

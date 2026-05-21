import { formatDate } from '@/lib/format';
import { Check, Clock, Lock, Pencil } from 'lucide-react';
import {
  SELF_EVAL_QUESTION_KEYS,
  SELF_EVAL_QUESTION_LABELS,
  type ReviewSubmission,
} from '@/types/review';

interface Props {
  selfEval: ReviewSubmission | null;
  subjectName?: string;
}

export function SelfEvalReadOnly({ selfEval, subjectName }: Props) {
  if (!selfEval) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <p className="text-[13px] font-semibold text-slate-700">Self-evaluation</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {subjectName ?? 'The employee'} hasn&apos;t been assigned a self-eval for this cycle.
          </p>
        </div>
      </div>
    );
  }

  const isFinal = selfEval.status === 'submitted' || selfEval.status === 'locked';
  const answers = selfEval.selfAnswers;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-slate-700">
            Self-evaluation by {selfEval.subjectName}
          </p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {isFinal && selfEval.submittedAt
              ? `Submitted on ${formatDate(selfEval.submittedAt)}.`
              : 'Not yet submitted — answers may still change.'}
          </p>
        </div>
        <StatusPill status={selfEval.status} />
      </div>

      <div className="px-5 py-4">
        {!answers || !isFinal ? (
          <p className="text-[13px] text-slate-400 italic">
            {answers
              ? 'Draft in progress — wait for the employee to submit before relying on these answers.'
              : 'No answers yet.'}
          </p>
        ) : (
          <ol className="space-y-4">
            {SELF_EVAL_QUESTION_KEYS.map((key, i) => {
              const value = answers[key] ?? '';
              return (
                <li key={key}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.8px] text-slate-400 mb-0.5">
                    Q{i + 1}
                  </p>
                  <p className="text-[12px] font-medium text-slate-700 mb-1.5">
                    {SELF_EVAL_QUESTION_LABELS[key]}
                  </p>
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-[12px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {value || <span className="italic text-slate-400">(left blank)</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ReviewSubmission['status'] }) {
  const map = {
    submitted:     { label: 'Submitted',   cls: 'bg-[#E1F5EE] text-[#0F6E56]',               icon: <Check size={10} /> },
    'in-progress': { label: 'In progress', cls: 'bg-[#FAEEDA] text-[#854F0B]',               icon: <Pencil size={10} /> },
    'not-started': { label: 'Not started', cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]', icon: <Clock size={10} /> },
    locked:        { label: 'Locked',      cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]', icon: <Lock size={10} /> },
  } as const;
  const { label, cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

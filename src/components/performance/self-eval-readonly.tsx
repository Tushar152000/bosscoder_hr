import { formatDate } from '@/lib/format';
import { Check, ChevronDown, Clock, Lock, Pencil } from 'lucide-react';
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
  if (!selfEval) return null;

  const isFinal = selfEval.status === 'submitted' || selfEval.status === 'locked';
  const answers = selfEval.selfAnswers;

  return (
    <details className="rounded-xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden group">
      <summary className="px-5 py-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors list-none">
        <div>
          <p className="text-[13px] font-semibold text-slate-700">
            {subjectName ?? selfEval.subjectName}&apos;s self-evaluation
          </p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {isFinal && selfEval.submittedAt
              ? `Submitted ${formatDate(selfEval.submittedAt)} · click to expand`
              : 'Not yet submitted · click to expand'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={selfEval.status} />
          <ChevronDown size={15} className="text-slate-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="px-5 pb-5 border-t border-[#E2E8F0]">
        {!answers || !isFinal ? (
          <p className="text-[13px] text-slate-400 italic pt-4">
            {answers ? 'Draft in progress — wait for the employee to submit.' : 'No answers yet.'}
          </p>
        ) : (
          <ol className="space-y-4 pt-4">
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
    </details>
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

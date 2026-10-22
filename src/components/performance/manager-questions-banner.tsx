import Link from 'next/link';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import type { ReviewSubmission } from '@/types/review';

/**
 * For managers: submitted evaluations from before the two written questions
 * existed, each linking to the form where the answers can be added.
 */
export function ManagerQuestionsBanner({ subs }: { subs: ReviewSubmission[] }) {
  if (subs.length === 0) return null;
  return (
    <div className="rounded-xl border border-[#FAC775] bg-[#FAEEDA] px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-[#854F0B]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#854F0B]">
            {subs.length === 1 ? '1 review needs' : `${subs.length} reviews need`} two written answers
          </p>
          <p className="mt-0.5 text-[12px] text-[#854F0B]/90">
            Evaluations now ask about key contributions last quarter and focus areas for next quarter.
            Your ratings stay as submitted — just add the answers.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {subs.map((s) => (
              <Link
                key={s.submissionId}
                href={`/performance/submissions/${s.submissionId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#FAC775] bg-white px-3 py-1.5 text-[12px] font-medium text-[#854F0B] transition hover:bg-[#FFF8EC]"
              >
                {s.subjectName}
                <span className="text-[#854F0B]/60">· {s.cycleName}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

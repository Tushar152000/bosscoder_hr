'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Bell, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission } from '@/types/review';
import { sendManagerNudgeAction } from '@/app/(app)/performance/actions';

export type SubmittedVariant = 'reviewed' | 'awaiting' | 'overdue';

export function getSubmittedVariant(
  mgrEval: ReviewSubmission | null | undefined,
  selfSub: ReviewSubmission,
): SubmittedVariant {
  if (mgrEval && (mgrEval.status === 'submitted' || mgrEval.status === 'locked')) {
    return 'reviewed';
  }
  const submittedAt = selfSub.submittedAt;
  if (!submittedAt) return 'awaiting';
  const daysSince = Math.floor((Date.now() - submittedAt.getTime()) / 864e5);
  return daysSince > 14 ? 'overdue' : 'awaiting';
}

const STYLES: Record<
  SubmittedVariant,
  { bar: string; iconWrap: string; Icon: React.ElementType; badge: string; label: string }
> = {
  reviewed: {
    bar: 'after:bg-[#0F6E56]',
    iconWrap: 'bg-[#E1F5EE] text-[#0F6E56] ring-1 ring-emerald-200',
    Icon: CheckCircle2,
    badge: 'bg-[#E1F5EE] text-[#0F6E56]',
    label: 'Reviewed',
  },
  awaiting: {
    bar: 'after:bg-amber-400',
    iconWrap: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
    Icon: Clock,
    badge: 'bg-amber-50 text-amber-700',
    label: 'Awaiting review',
  },
  overdue: {
    bar: 'after:bg-red-400',
    iconWrap: 'bg-red-50 text-red-600 ring-1 ring-red-200',
    Icon: AlertCircle,
    badge: 'bg-red-50 text-red-700',
    label: 'Review overdue',
  },
};

interface Props {
  self: ReviewSubmission;
  mgrEval?: ReviewSubmission | null;
  prevRating?: number | null;
}

export function SubmittedCard({ self: selfSub, mgrEval, prevRating }: Props) {
  const variant = getSubmittedVariant(mgrEval, selfSub);
  const { bar, iconWrap, Icon, badge, label } = STYLES[variant];

  const rating = mgrEval?.managerOverallRating ?? null;
  const delta = rating != null && prevRating != null ? rating - prevRating : null;
  const snippet = mgrEval?.managerNotes
    ? mgrEval.managerNotes.slice(0, 110) + (mgrEval.managerNotes.length > 110 ? '…' : '')
    : null;

  const nudgeKey = `nudge:${mgrEval?.submissionId ?? selfSub.cycleId}`;
  const [nudgeSent, setNudgeSent] = useState(false);
  const [nudging, setNudging] = useState(false);

  useEffect(() => {
    const ts = localStorage.getItem(nudgeKey);
    if (ts && Date.now() - parseInt(ts, 10) < 60 * 60 * 1000) setNudgeSent(true);
  }, [nudgeKey]);

  async function handleNudge() {
    if (!mgrEval || nudgeSent || nudging) return;
    setNudging(true);
    const res = await sendManagerNudgeAction(mgrEval.submissionId);
    if (res.ok) {
      localStorage.setItem(nudgeKey, String(Date.now()));
      setNudgeSent(true);
    }
    setNudging(false);
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded-xl bg-white border border-slate-200/70 p-4',
        'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[3px]',
        bar,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', iconWrap)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', badge)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {label}
        </span>
      </div>

      {/* Title */}
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-slate-900">Self-evaluation</div>
        <div className="mt-0.5 truncate text-[12px] text-slate-500">{selfSub.cycleName}</div>
      </div>

      {/* Reviewed: rating + delta */}
      {variant === 'reviewed' && rating != null && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-semibold text-slate-900 tabular-nums leading-none">
            {rating.toFixed(1)}
          </span>
          <span className="text-[11px] text-slate-400">/5</span>
          {delta != null && delta !== 0 && (
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                delta > 0 ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#FAECE7] text-[#993C1D]',
              )}
            >
              {delta > 0 ? '+' : ''}{delta.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Reviewed: feedback snippet */}
      {variant === 'reviewed' && snippet && (
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 italic">
          &ldquo;{snippet}&rdquo;
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-[11px] text-slate-400 truncate">
          {selfSub.submittedAt ? `Submitted ${formatDate(selfSub.submittedAt)}` : 'Submitted'}
          {variant === 'reviewed' && mgrEval?.submittedAt
            ? ` · Reviewed ${formatDate(mgrEval.submittedAt)}`
            : ''}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Nudge button (awaiting / overdue only) */}
          {mgrEval && variant !== 'reviewed' && (
            <button
              type="button"
              onClick={handleNudge}
              disabled={nudgeSent || nudging}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition',
                nudgeSent
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
              )}
            >
              <Bell className="h-3 w-3" />
              {nudgeSent ? 'Nudged' : nudging ? '…' : 'Nudge'}
            </button>
          )}

          {/* View link */}
          <Link
            href={`/performance/submissions/${selfSub.submissionId}`}
            className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium text-brand hover:bg-surface-muted transition"
          >
            View
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

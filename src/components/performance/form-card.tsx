import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ReviewCycle, ReviewSubmission } from '@/types/review';

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function cycleDeadline(c: ReviewCycle): Date | null {
  if (c.status === 'closed' && c.closedAt) return c.closedAt;
  // Explicit due date set by HR takes priority over name-derived deadline
  if (c.dueDate) return c.dueDate;
  const monthName = MONTHS_LONG.find((m) => c.name.startsWith(m));
  if (monthName) {
    const yr = parseInt(c.name.slice(monthName.length).trim(), 10);
    if (Number.isFinite(yr))
      return new Date(yr, MONTHS_LONG.indexOf(monthName) + 1, 0, 23, 59, 59);
  }
  const qm = /^Q([1-4])\s+(\d{4})$/.exec(c.name);
  if (qm) return new Date(parseInt(qm[2], 10), parseInt(qm[1], 10) * 3, 0, 23, 59, 59);
  if (c.openedAt) {
    const days = c.cadence === 'quarterly' ? 90 : 30;
    return new Date(c.openedAt.getTime() + days * 864e5);
  }
  return null;
}

export function daysUntil(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / 864e5);
}

export type Urgency = 'overdue' | 'critical' | 'warning' | 'safe' | 'done' | 'locked';

export function urgencyOf(
  status: ReviewSubmission['status'],
  daysLeft: number | null,
): Urgency {
  if (status === 'locked') return 'locked';
  if (status === 'submitted') return 'done';
  if (daysLeft == null) return 'safe';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft < 5) return 'critical';
  if (daysLeft <= 10) return 'warning';
  return 'safe';
}

export interface Enriched {
  sub: ReviewSubmission;
  deadline: Date | null;
  daysLeft: number | null;
  isPending: boolean;
  isUrgent: boolean;
  urgency: Urgency;
  selfEvalStatus?: string | null;
}

const URGENCY: Record<Urgency, { iconWrap: string; icon: typeof ClipboardList; bar: string }> = {
  overdue:  { iconWrap: 'bg-red-50 text-red-600 ring-1 ring-red-200',           icon: AlertCircle,   bar: 'after:bg-red-400'      },
  critical: { iconWrap: 'bg-red-50 text-red-600 ring-1 ring-red-200',           icon: AlertCircle,   bar: 'after:bg-red-400'      },
  warning:  { iconWrap: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',     icon: ClipboardList, bar: 'after:bg-amber-400'    },
  safe:     { iconWrap: 'bg-[#E1F5EE] text-[#0F6E56] ring-1 ring-emerald-200', icon: ClipboardList, bar: 'after:bg-emerald-400'  },
  done:     { iconWrap: 'bg-[#E1F5EE] text-[#0F6E56] ring-1 ring-emerald-200', icon: CheckCircle2,  bar: 'after:bg-transparent'  },
  locked:   { iconWrap: 'bg-slate-100 text-slate-400 ring-1 ring-slate-200',    icon: Lock,          bar: 'after:bg-transparent'  },
};

export function FormCard({ item }: { item: Enriched }) {
  const { sub, daysLeft, urgency, selfEvalStatus } = item;
  const s = URGENCY[urgency];
  const Icon = s.icon;
  const title = sub.kind === 'self' ? 'Self-evaluation' : `Evaluate ${sub.subjectName}`;
  const subtitle = [sub.cycleName, sub.kind === 'manager' ? sub.subjectDepartment : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/performance/submissions/${sub.submissionId}`}
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-xl bg-white border border-slate-200/70 p-4 transition',
        'hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:border-slate-300',
        'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[3px]',
        s.bar,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', s.iconWrap)}>
          <Icon className="h-5 w-5" />
        </div>
        <StatusPill status={sub.status} selfEvalStatus={selfEvalStatus} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-slate-900">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[12px] text-slate-500">{subtitle}</div>}
      </div>
      <DeadlineLine item={item} daysLeft={daysLeft} />
    </Link>
  );
}

function DeadlineLine({ item, daysLeft }: { item: Enriched; daysLeft: number | null }) {
  const { sub, urgency, deadline } = item;

  if (sub.status === 'submitted' && sub.submittedAt) {
    return (
      <div className="flex items-center justify-between text-[12px] text-slate-500">
        <span>Submitted {formatDate(sub.submittedAt)}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    );
  }
  if (sub.status === 'locked') {
    return (
      <div className="flex items-center justify-between text-[12px] text-slate-500">
        <span>{sub.lockedAt ? `Locked ${formatDate(sub.lockedAt)}` : 'Locked'}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    );
  }

  let label: string;
  if (daysLeft == null) {
    label = 'No deadline';
  } else if (daysLeft < 0) {
    const d = Math.abs(daysLeft);
    label = `Overdue by ${d} ${d === 1 ? 'day' : 'days'}`;
  } else if (daysLeft === 0) {
    label = 'Due today';
  } else if (daysLeft === 1) {
    label = 'Due tomorrow';
  } else {
    label = `Due in ${daysLeft} days`;
  }

  const tone =
    urgency === 'overdue' || urgency === 'critical'
      ? 'text-red-600'
      : urgency === 'warning'
      ? 'text-amber-600'
      : urgency === 'safe'
      ? 'text-[#0F6E56]'
      : 'text-slate-500';

  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className={tone} title={deadline?.toDateString()}>
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
    </div>
  );
}

function StatusPill({ status, selfEvalStatus }: { status: ReviewSubmission['status']; selfEvalStatus?: string | null }) {
  const selfDone = selfEvalStatus === 'submitted' || selfEvalStatus === 'locked';
  const map: Record<ReviewSubmission['status'], { label: string; cls: string }> = {
    submitted:     { label: 'Submitted',          cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
    'in-progress': { label: 'In progress',        cls: 'bg-amber-50 text-amber-700'  },
    'not-started': selfDone
      ? { label: 'Ready to evaluate', cls: 'bg-[#EBF3FE] text-[#0C447C]' }
      : { label: 'Not started',       cls: 'bg-slate-100 text-slate-600' },
    locked:        { label: 'Locked',             cls: 'bg-slate-100 text-slate-500' },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        s.cls,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

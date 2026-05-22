'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ReviewCycle, ReviewSubmission } from '@/types/review';

type Tab = 'open' | 'urgent' | 'submitted' | 'closed';

interface Props {
  submissions: ReviewSubmission[];
  /** Map of cycleId → cycle so we can compute deadlines without extra fetches. */
  cyclesById: Record<string, ReviewCycle>;
}

interface Enriched {
  sub: ReviewSubmission;
  deadline: Date | null;
  /** Days remaining until deadline. Negative = overdue. Null = unknown. */
  daysLeft: number | null;
  /** Pending status (not-started or in-progress). */
  isPending: boolean;
  /** Pending AND red (< 5 days or overdue). */
  isUrgent: boolean;
  /** Urgency bucket — drives the bottom underbar color. */
  urgency: 'overdue' | 'critical' | 'warning' | 'safe' | 'done' | 'locked';
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function cycleDeadline(c: ReviewCycle): Date | null {
  if (c.status === 'closed' && c.closedAt) return c.closedAt;
  if (c.dueDate) return c.dueDate;

  // "Month YYYY" — end of that month
  const monthName = MONTHS_LONG.find((m) => c.name.startsWith(m));
  if (monthName) {
    const yr = parseInt(c.name.slice(monthName.length).trim(), 10);
    const monthIdx = MONTHS_LONG.indexOf(monthName);
    if (Number.isFinite(yr)) {
      return new Date(yr, monthIdx + 1, 0, 23, 59, 59);
    }
  }

  // "Qn YYYY" — end of last month in quarter
  const qm = /^Q([1-4])\s+(\d{4})$/.exec(c.name);
  if (qm) {
    const q = parseInt(qm[1], 10);
    const yr = parseInt(qm[2], 10);
    const lastMonthIdx = q * 3 - 1;
    return new Date(yr, lastMonthIdx + 1, 0, 23, 59, 59);
  }

  // Fallback: openedAt + cadence window
  if (c.openedAt) {
    const days = c.cadence === 'quarterly' ? 90 : 30;
    return new Date(c.openedAt.getTime() + days * 24 * 60 * 60 * 1000);
  }
  return null;
}

function daysUntil(deadline: Date, now: Date): number {
  const ms = deadline.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function urgencyOf(
  status: ReviewSubmission['status'],
  daysLeft: number | null
): Enriched['urgency'] {
  if (status === 'locked') return 'locked';
  if (status === 'submitted') return 'done';
  if (daysLeft == null) return 'safe';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft < 5) return 'critical';
  if (daysLeft <= 10) return 'warning';
  return 'safe';
}

const URGENCY_STYLES: Record<
  Enriched['urgency'],
  {
    iconWrap: string;
    icon: typeof ClipboardList;
    /** Bottom 3px traffic-light underbar. */
    underbar: string;
  }
> = {
  overdue: {
    iconWrap: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
    icon: AlertCircle,
    underbar: 'after:bg-red-500',
  },
  critical: {
    iconWrap: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
    icon: AlertCircle,
    underbar: 'after:bg-red-500',
  },
  warning: {
    iconWrap: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    icon: ClipboardList,
    underbar: 'after:bg-yellow-400',
  },
  safe: {
    iconWrap: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    icon: ClipboardList,
    underbar: 'after:bg-emerald-500',
  },
  done: {
    iconWrap: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    icon: CheckCircle2,
    underbar: 'after:bg-transparent',
  },
  locked: {
    iconWrap: 'bg-white/5 text-muted ring-1 ring-white/10',
    icon: Lock,
    underbar: 'after:bg-transparent',
  },
};

export function MyFormsTabs({ submissions, cyclesById }: Props) {
  // Pin "now" once per render. Day-granularity is fine — re-renders per nav.
  const now = useMemo(() => new Date(), []);

  const enriched = useMemo<Enriched[]>(
    () =>
      submissions.map((sub) => {
        const cycle = cyclesById[sub.cycleId];
        const deadline = cycle ? cycleDeadline(cycle) : null;
        const daysLeft = deadline ? daysUntil(deadline, now) : null;
        const isPending = sub.status === 'not-started' || sub.status === 'in-progress';
        const urgency = urgencyOf(sub.status, daysLeft);
        const isUrgent = isPending && (urgency === 'critical' || urgency === 'overdue');
        return { sub, deadline, daysLeft, isPending, isUrgent, urgency };
      }),
    [submissions, cyclesById, now]
  );

  const buckets = useMemo(() => {
    const open: Enriched[] = [];
    const urgent: Enriched[] = [];
    const submitted: Enriched[] = [];
    const closed: Enriched[] = [];
    for (const e of enriched) {
      if (e.sub.status === 'locked') closed.push(e);
      else if (e.sub.status === 'submitted') submitted.push(e);
      else {
        open.push(e);
        if (e.isUrgent) urgent.push(e);
      }
    }
    // Sort: open by deadline ascending; submitted by submittedAt desc; closed by lockedAt desc
    open.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    urgent.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    submitted.sort((a, b) => (b.sub.submittedAt?.getTime() ?? 0) - (a.sub.submittedAt?.getTime() ?? 0));
    closed.sort((a, b) => (b.sub.lockedAt?.getTime() ?? 0) - (a.sub.lockedAt?.getTime() ?? 0));
    return { open, urgent, submitted, closed };
  }, [enriched]);

  // Default to the most relevant tab.
  const [tab, setTab] = useState<Tab>(() => {
    if (buckets.urgent.length > 0) return 'urgent';
    if (buckets.open.length > 0) return 'open';
    if (buckets.submitted.length > 0) return 'submitted';
    return 'closed';
  });

  const visible = buckets[tab];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">My forms</h2>
        {buckets.urgent.length > 0 && tab !== 'urgent' && (
          <button
            type="button"
            onClick={() => setTab('urgent')}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/20"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {buckets.urgent.length} need {buckets.urgent.length === 1 ? 'action' : 'actions'}
          </button>
        )}
      </div>

      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1">
        <TabButton
          label="Open"
          count={buckets.open.length}
          active={tab === 'open'}
          onClick={() => setTab('open')}
        />
        <TabButton
          label="Needs action"
          count={buckets.urgent.length}
          active={tab === 'urgent'}
          onClick={() => setTab('urgent')}
          tone={buckets.urgent.length > 0 ? 'danger' : 'default'}
        />
        <TabButton
          label="Submitted"
          count={buckets.submitted.length}
          active={tab === 'submitted'}
          onClick={() => setTab('submitted')}
        />
        <TabButton
          label="Closed"
          count={buckets.closed.length}
          active={tab === 'closed'}
          onClick={() => setTab('closed')}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((e) => (
            <FormTile key={e.sub.submissionId} item={e} />
          ))}
        </div>
      )}
    </section>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
  tone = 'default',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? tone === 'danger'
            ? 'bg-red-500/20 text-red-200 ring-1 ring-red-500/40'
            : 'bg-white/10 text-white ring-1 ring-white/15'
          : 'text-muted hover:bg-white/5 hover:text-white'
      )}
    >
      {label}
      <span
        className={cn(
          'inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
          active
            ? tone === 'danger'
              ? 'bg-red-500/25 text-red-100'
              : 'bg-white/15 text-white'
            : tone === 'danger' && count > 0
            ? 'bg-red-500/15 text-red-300'
            : 'bg-white/5 text-muted'
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FormTile({ item }: { item: Enriched }) {
  const { sub, daysLeft, urgency } = item;
  const styles = URGENCY_STYLES[urgency];
  const Icon = styles.icon;

  const title = sub.kind === 'self' ? 'Self-evaluation' : `Evaluate ${sub.subjectName}`;
  const subtitle = [sub.cycleName, sub.kind === 'manager' ? sub.subjectDepartment : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/performance/submissions/${sub.submissionId}`}
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-default bg-card p-4 transition-colors',
        'hover:border-white/20 hover:bg-white/[0.02]',
        // Bottom traffic-light underbar — green / yellow / red.
        'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[3px]',
        styles.underbar
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
            styles.iconWrap
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <StatusPill status={sub.status} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{title}</div>
        {subtitle && (
          <div className="mt-0.5 truncate text-xs text-muted">{subtitle}</div>
        )}
      </div>
      <DeadlineLine item={item} daysLeft={daysLeft} />
    </Link>
  );
}

function DeadlineLine({ item, daysLeft }: { item: Enriched; daysLeft: number | null }) {
  const { sub, urgency, deadline } = item;

  if (sub.status === 'submitted' && sub.submittedAt) {
    return (
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Submitted {formatDate(sub.submittedAt)}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    );
  }
  if (sub.status === 'locked') {
    return (
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{sub.lockedAt ? `Locked ${formatDate(sub.lockedAt)}` : 'Locked'}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    );
  }
  // Pending — show urgency
  let label: string;
  if (daysLeft == null) {
    label = 'No deadline';
  } else if (daysLeft < 0) {
    const overdue = Math.abs(daysLeft);
    label = `Overdue by ${overdue} ${overdue === 1 ? 'day' : 'days'}`;
  } else if (daysLeft === 0) {
    label = 'Due today';
  } else if (daysLeft === 1) {
    label = 'Due tomorrow';
  } else {
    label = `Due in ${daysLeft} days`;
  }
  const tone =
    urgency === 'overdue' || urgency === 'critical'
      ? 'text-red-300'
      : urgency === 'warning'
      ? 'text-amber-300'
      : urgency === 'safe'
      ? 'text-emerald-300'
      : 'text-muted';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={tone} title={deadline ? deadline.toDateString() : undefined}>
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
    </div>
  );
}

function StatusPill({ status }: { status: ReviewSubmission['status'] }) {
  const map: Record<ReviewSubmission['status'], { label: string; cls: string }> = {
    submitted: {
      label: 'Submitted',
      cls: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    },
    'in-progress': {
      label: 'In progress',
      cls: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    },
    'not-started': {
      label: 'Not started',
      cls: 'bg-white/10 text-white ring-1 ring-white/10',
    },
    locked: {
      label: 'Locked',
      cls: 'bg-white/5 text-muted ring-1 ring-white/10',
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        s.cls
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { title: string; body: string }> = {
    open: {
      title: 'All caught up.',
      body: 'No open forms right now. Check back when a new cycle opens.',
    },
    urgent: {
      title: 'Nothing urgent.',
      body: 'No open forms with a deadline within the next 14 days.',
    },
    submitted: {
      title: 'No submissions yet.',
      body: 'Forms you submit will appear here.',
    },
    closed: {
      title: 'No closed forms.',
      body: 'Forms from cycles that have been closed will appear here.',
    },
  };
  const m = map[tab];
  return (
    <div className="rounded-xl border border-default bg-card p-5 text-sm text-muted">
      <span className="font-medium text-white">{m.title}</span> {m.body}
    </div>
  );
}

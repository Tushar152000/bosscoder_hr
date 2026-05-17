'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FormCard,
  cycleDeadline,
  daysUntil,
  urgencyOf,
  type Enriched,
} from './form-card';
import type { ReviewCycle, ReviewSubmission } from '@/types/review';

type Tab = 'open' | 'urgent' | 'submitted' | 'closed';

const TAB_LABELS: Record<Tab, string> = {
  open:      'Open',
  urgent:    'Needs action',
  submitted: 'Submitted',
  closed:    'Closed',
};

interface Props {
  submissions: ReviewSubmission[];
  cyclesById: Record<string, ReviewCycle>;
}

export function MyQueue({ submissions, cyclesById }: Props) {
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
    [submissions, cyclesById, now],
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
    open.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    urgent.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    submitted.sort(
      (a, b) => (b.sub.submittedAt?.getTime() ?? 0) - (a.sub.submittedAt?.getTime() ?? 0),
    );
    closed.sort(
      (a, b) => (b.sub.lockedAt?.getTime() ?? 0) - (a.sub.lockedAt?.getTime() ?? 0),
    );
    return { open, urgent, submitted, closed };
  }, [enriched]);

  const [tab, setTab] = useState<Tab>(() => {
    if (buckets.urgent.length > 0) return 'urgent';
    if (buckets.open.length > 0) return 'open';
    if (buckets.submitted.length > 0) return 'submitted';
    return 'closed';
  });

  const visible = buckets[tab];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EBF3FE]">
            <ClipboardList className="h-[18px] w-[18px] text-[#0C447C]" />
          </div>
          <div>
            <div className="flex items-center gap-2 ">
              <h2 className="text-[15px] font-semibold text-slate-900">My queue</h2>
              {buckets.open.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#EBF3FE] px-1.5 py-0.5 text-[10px] font-semibold text-[#0C447C] tabular-nums">
                  {buckets.open.length} open
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Forms assigned to you across all cycles.
            </p>
          </div>
        </div>

        {buckets.urgent.length > 0 && tab !== 'urgent' && (
          <button
            type="button"
            onClick={() => setTab('urgent')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100 transition"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {buckets.urgent.length} need{buckets.urgent.length === 1 ? 's' : ''} action
          </button>
        )}
      </div>


      <div className="flex items-center gap-1 overflow-x-auto px-1 pb-1 pt-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const isDanger = t === 'urgent';
          const count = buckets[t].length;
          const isActive = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[14px] font-medium transition',
                isActive
                  ? isDanger
                    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                    : 'bg-[#0C447C] text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              {TAB_LABELS[t]}
              <span
                className={cn(
                  'inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  isActive
                    ? isDanger
                      ? 'bg-red-100 text-red-700'
                      : 'bg-white/20 text-white'
                    : isDanger && count > 0
                    ? 'bg-red-50 text-red-600'
                    : 'bg-slate-100 text-slate-500',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((e) => (
            <FormCard key={e.sub.submissionId} item={e} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { title: string; body: string }> = {
    open:      { title: 'All caught up.',     body: 'No open forms right now. Check back when a new cycle opens.' },
    urgent:    { title: 'Nothing urgent.',    body: 'No forms due within the next 14 days.'                      },
    submitted: { title: 'No submissions yet.', body: 'Forms you submit will appear here.'                        },
    closed:    { title: 'No closed forms.',   body: 'Forms from closed cycles will appear here.'                 },
  };
  const m = map[tab];
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-5 text-[13px] text-slate-500">
      <span className="font-medium text-slate-700">{m.title}</span> {m.body}
    </div>
  );
}

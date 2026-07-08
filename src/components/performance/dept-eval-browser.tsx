'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { cn, initials } from '@/lib/utils';
import type { ReviewSubmission, SubmissionStatus } from '@/types/review';

const ALL_DEPTS = '__all__';

interface Props {
  /** Self-eval submissions, one per subject. Rows are built from these. */
  subs: ReviewSubmission[];
  /** subjectEmployeeId → that person's manager-eval (any status), for the rating column. */
  managerBySubject?: Record<string, ReviewSubmission>;
  myEmail: string;
  myUid: string;
  myEmployeeId: string | null;
  /** Skip the logged-in user's own row (their self-eval is shown separately above). */
  hideOwn?: boolean;
}

/**
 * Lists evaluations grouped by department, with a dropdown to filter to a
 * single department (or show all).
 */
export function DeptEvalBrowser({
  subs,
  managerBySubject = {},
  myEmail,
  myUid,
  myEmployeeId,
  hideOwn = true,
}: Props) {
  const grouped = useMemo(() => {
    const g = new Map<string, ReviewSubmission[]>();
    for (const s of subs) {
      if (hideOwn) {
        const isMe =
          (s.reviewerUid && s.reviewerUid === myUid) ||
          s.reviewerEmail.toLowerCase() === myEmail ||
          (myEmployeeId && s.subjectEmployeeId === myEmployeeId);
        if (isMe) continue;
      }
      const k = s.subjectDepartment || '— Unassigned —';
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(s);
    }
    return g;
  }, [subs, myEmail, myUid, myEmployeeId, hideOwn]);

  // Order departments: known DEPARTMENTS first (in their canonical order), then the rest.
  const orderedDepts = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const d of DEPARTMENTS) {
      if (grouped.has(d)) {
        out.push(d);
        seen.add(d);
      }
    }
    for (const d of grouped.keys()) {
      if (!seen.has(d)) out.push(d);
    }
    return out;
  }, [grouped]);

  const [dept, setDept] = useState<string>(ALL_DEPTS);

  if (orderedDepts.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-[13px] text-slate-500">
        Nothing to view here.
      </div>
    );
  }

  const visibleDepts =
    dept === ALL_DEPTS ? orderedDepts : orderedDepts.filter((d) => d === dept);

  return (
    <div className="space-y-4">
      {/* Department filter */}
      <div className="relative inline-block">
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[13px] font-medium text-slate-700 transition focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
          aria-label="Filter by department"
        >
          <option value={ALL_DEPTS}>All departments</option>
          {orderedDepts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>

      {visibleDepts.map((d) => {
        const rows = grouped.get(d)!;
        const submitted = rows.filter(
          (r) => r.status === 'submitted' || r.status === 'locked',
        ).length;
        return (
          <div key={d}>
            <div className="mb-2 flex items-center gap-2.5">
              <h3 className="text-[14px] font-medium text-slate-900">{d}</h3>
              <span className="rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[11px] text-slate-600">
                {submitted} / {rows.length} self-eval submitted
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-card">
              {/* Column header */}
              <div className="grid grid-cols-[1fr_104px_168px_28px] items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Employee</span>
                <span>Self-eval</span>
                <span>Manager rating</span>
                <span />
              </div>
              {rows.map((s) => {
                const mgr = managerBySubject[s.subjectEmployeeId] ?? null;
                // Open the fullest view available: the manager-eval page shows the
                // self-eval answers read-only PLUS the manager's rating & notes.
                const href = `/performance/submissions/${mgr?.submissionId ?? s.submissionId}`;
                return (
                  <Link
                    key={s.submissionId}
                    href={href}
                    className="grid grid-cols-[1fr_104px_168px_28px] items-center gap-3 border-b border-[#E2E8F0] px-4 py-2.5 last:border-b-0 hover:bg-[#F8FAFC] transition"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[10px] font-medium text-[#0C447C]">
                        {initials(s.subjectName, s.subjectEmail)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-slate-900">
                          {s.subjectName}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">{s.subjectEmail}</p>
                      </div>
                    </div>
                    <SubStatusPill status={s.status} />
                    <ManagerRatingCell mgr={mgr} />
                    <ArrowRight className="h-3.5 w-3.5 justify-self-end text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Lower rating = better in this org (1 = top, 5 = lowest), so tones invert. */
function ratingTone(r: number): string {
  if (r <= 2) return 'bg-[#E1F5EE] text-[#0F6E56]';
  if (r <= 3) return 'bg-slate-100 text-slate-700';
  if (r <= 4) return 'bg-[#FAEEDA] text-[#854F0B]';
  return 'bg-[#FAECE7] text-[#993C1D]';
}

function ManagerRatingCell({ mgr }: { mgr: ReviewSubmission | null }) {
  if (!mgr) {
    return <span className="text-[11px] text-slate-400">No manager</span>;
  }
  const done = mgr.status === 'submitted' || mgr.status === 'locked';
  const rating = mgr.managerOverallRating;
  return (
    <div className="flex min-w-0 items-center gap-2">
      {done && rating != null ? (
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums',
            ratingTone(rating),
          )}
        >
          {rating.toFixed(1)}
          <span className="ml-0.5 text-[9px] font-medium opacity-70">/5</span>
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {mgr.status === 'in-progress' ? 'In progress' : 'Awaiting'}
        </span>
      )}
      {mgr.reviewerName && (
        <span className="truncate text-[10px] text-slate-500">{mgr.reviewerName}</span>
      )}
    </div>
  );
}

function SubStatusPill({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, { label: string; cls: string }> = {
    submitted: { label: 'Submitted', cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
    'in-progress': { label: 'In progress', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
    'not-started': {
      label: 'Not started',
      cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]',
    },
    locked: { label: 'Locked', cls: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]' },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

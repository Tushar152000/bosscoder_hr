'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, ChevronDown, Download, Loader2 } from 'lucide-react';
import { getEvalExportRowsAction } from '@/app/(app)/performance/actions';
import { cycleNameWithMonths } from '@/lib/performance/cycle-period';
import {
  downloadEvalCsv,
  groupSelfEvalsByDept,
  isDone,
  STATUS_LABEL,
  toEvalExportRows,
  type EvalExportRow,
} from '@/lib/performance/eval-export';
import { cn, initials } from '@/lib/utils';
import type { ReviewSubmission, SubmissionStatus } from '@/types/review';

const ALL_DEPTS = '__all__';

interface Props {
  /** The cycle being viewed — `subs` / `managerBySubject` belong to it. */
  cycleId: string;
  /** Cycles offered in the download picker (other cycles are fetched on demand). */
  cycles?: { cycleId: string; name: string }[];
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
 * single department (or show all), and a CSV download for any cycle.
 */
export function DeptEvalBrowser({
  cycleId,
  cycles = [],
  subs,
  managerBySubject = {},
  myEmail,
  myUid,
  myEmployeeId,
  hideOwn = true,
}: Props) {
  const groups = useMemo(
    () => groupSelfEvalsByDept(subs, { email: myEmail, uid: myUid, employeeId: myEmployeeId }, hideOwn),
    [subs, myEmail, myUid, myEmployeeId, hideOwn],
  );
  const grouped = useMemo(() => new Map(groups), [groups]);
  const orderedDepts = useMemo(() => groups.map(([d]) => d), [groups]);

  const [dept, setDept] = useState<string>(ALL_DEPTS);
  const [exportCycleId, setExportCycleId] = useState(cycleId);
  const [exporting, startExport] = useTransition();

  if (orderedDepts.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-[13px] text-slate-500">
        Nothing to view here.
      </div>
    );
  }

  const visibleDepts =
    dept === ALL_DEPTS ? orderedDepts : orderedDepts.filter((d) => d === dept);

  /** Download the picked cycle as a CSV, one row per person, respecting the department filter. */
  function handleDownload() {
    const cycleName =
      cycles.find((c) => c.cycleId === exportCycleId)?.name ?? subs[0]?.cycleName ?? 'Evaluations';
    const label = cycleNameWithMonths(cycleName);
    const fileName = `${label}${dept === ALL_DEPTS ? '' : ` – ${dept}`} – evaluations.csv`;
    const inDept = (rows: EvalExportRow[]) =>
      dept === ALL_DEPTS ? rows : rows.filter((r) => r.department === dept);

    if (exportCycleId === cycleId) {
      downloadEvalCsv(inDept(toEvalExportRows(groups, managerBySubject)), fileName);
      return;
    }
    startExport(async () => {
      const res = await getEvalExportRowsAction(exportCycleId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const rows = inDept(res.data);
      if (rows.length === 0) {
        toast.error(`No evaluations${dept === ALL_DEPTS ? '' : ` in ${dept}`} for ${label}`);
        return;
      }
      downloadEvalCsv(rows, fileName);
    });
  }

  const selectCls =
    'h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[13px] font-medium text-slate-700 transition focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 disabled:opacity-60';

  return (
    <div className="space-y-4">
      {/* Department filter + cycle picker + download */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-block">
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            disabled={exporting}
            className={selectCls}
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
        {cycles.length > 1 && (
          <div className="relative inline-block">
            <select
              value={exportCycleId}
              onChange={(e) => setExportCycleId(e.target.value)}
              disabled={exporting}
              className={selectCls}
              aria-label="Cycle to download"
            >
              {cycles.map((c) => (
                <option key={c.cycleId} value={c.cycleId}>
                  {cycleNameWithMonths(c.name)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={exporting}
          aria-busy={exporting}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {exporting ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>

      {visibleDepts.map((d) => {
        const rows = grouped.get(d)!;
        const submitted = rows.filter(isDone).length;
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
  const done = isDone(mgr);
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
  const cls: Record<SubmissionStatus, string> = {
    submitted: 'bg-[#E1F5EE] text-[#0F6E56]',
    'in-progress': 'bg-[#FAEEDA] text-[#854F0B]',
    'not-started': 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]',
    locked: 'bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0]',
  };
  const label = STATUS_LABEL[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls[status]}`}
    >
      {label}
    </span>
  );
}

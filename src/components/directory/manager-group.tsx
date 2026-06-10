import Link from 'next/link';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DirectoryManager, DirectoryPerson, DirectoryReport } from '@/types/directory';
import type { EmployeeStatus } from '@/types/employee';

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'Active',
  'on-notice': 'On notice',
  left: 'Left',
};

const STATUS_STYLE: Record<EmployeeStatus, string> = {
  active: 'text-[#0F6E56] bg-[#E1F5EE]',
  'on-notice': 'text-[#993C1D] bg-[#FAECE7]',
  left: 'text-slate-500 bg-slate-100',
};

const STATUS_DOT: Record<EmployeeStatus, string> = {
  active: 'bg-[#1D9E75]',
  'on-notice': 'bg-amber-500',
  left: 'bg-slate-400',
};

function StatusPill({ status }: { status: EmployeeStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full w-fit shrink-0', STATUS_STYLE[status])}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function matchesQuery(p: DirectoryPerson, q: string): boolean {
  return (
    p.name.toLowerCase().includes(q) ||
    p.email.toLowerCase().includes(q) ||
    p.designation.toLowerCase().includes(q)
  );
}
matchesQuery;

export function ManagerGroup({ manager }: { manager: DirectoryManager }) {
  const { user, reports } = manager;

  return (
    <>
      {/* Manager row */}
      <Link
        href={`/directory/${user.id}`}
        className="flex flex-col sm:grid sm:grid-cols-[1fr_110px_90px_70px] gap-1.5 sm:gap-3 items-start sm:items-center px-4 py-3 bg-[#FAFAF7] hover:bg-slate-50 active:bg-slate-100 transition touch-manipulation"
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 min-w-0 w-full">
          <div
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-[12px] font-medium shrink-0"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] sm:text-[13px] font-semibold text-slate-900 truncate">{user.name}</span>
              {reports.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0C447C] bg-[#E6F1FB] px-2 py-0.5 rounded-full shrink-0">
                  <Crown size={10} />
                  Manager
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate">{user.designation} · {user.email}</p>
          </div>
        </div>

        {/* Detail row — inline on mobile, grid cols on desktop */}
        <div className="flex items-center gap-3 sm:contents pl-[46px] sm:pl-0 flex-wrap">
          <span className="text-[11px] text-slate-500">
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </span>
          <StatusPill status={user.status} />
          <span className="text-[11px] text-slate-500 sm:text-right">{user.joinedAt}</span>
        </div>
      </Link>

      {/* Report rows */}
      {reports.map((report, idx) => (
        <ReportRow key={report.id} report={report} isLast={idx === reports.length - 1} />
      ))}
    </>
  );
}

function ReportRow({ report, isLast }: { report: DirectoryReport; isLast: boolean }) {
  return (
    <Link
      href={`/directory/${report.id}`}
      className="relative flex flex-col sm:grid sm:grid-cols-[1fr_110px_90px_70px] gap-1 sm:gap-3 items-start sm:items-center pl-10 sm:pl-10 pr-4 py-2.5 sm:py-2 border-t border-slate-200/70 hover:bg-slate-50/60 active:bg-slate-100/50 transition touch-manipulation"
    >
      {/* Tree connector */}
      <span className={cn('absolute left-[26px] top-0 w-px bg-slate-200', isLast ? 'h-1/2' : 'h-full')} />
      <span className="absolute left-[26px] top-1/2 w-3.5 h-px bg-slate-200/70" />

      {/* Avatar + name */}
      <div className="flex items-center gap-2.5 min-w-0 w-full">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium shrink-0"
          style={{ backgroundColor: report.avatarColor }}
        >
          {report.initials}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] sm:text-[12px] font-medium text-slate-900 truncate">{report.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{report.designation}</p>
        </div>
      </div>

      {/* Detail row */}
      <div className="flex items-center gap-3 sm:contents pl-[38px] sm:pl-0 flex-wrap">
        <span className="text-[11px] text-slate-500 capitalize">{report.type.replace('-', ' ')}</span>
        <StatusPill status={report.status} />
        <span className="text-[11px] text-slate-500 sm:text-right">{report.joinedAt}</span>
      </div>
    </Link>
  );
}

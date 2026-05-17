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
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full w-fit shrink-0', STATUS_STYLE[status])}>
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
matchesQuery; // used externally — suppress unused warning

export function ManagerGroup({ manager }: { manager: DirectoryManager }) {
  const { user, reports } = manager;

  return (
    <>
      {/* Manager row */}
      <Link
        href={`/directory/${user.id}`}
        className="grid grid-cols-[1fr] md:grid-cols-[1fr_110px_90px_70px] gap-2 md:gap-3 items-start md:items-center px-3.5 py-3 md:py-2.5 bg-[#FAFAF7] hover:bg-slate-50 transition"
      >
        {/* Left: avatar + name stack */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-medium shrink-0"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-medium text-slate-900 truncate">{user.name}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0C447C] bg-[#E6F1FB] px-2 py-0.5 rounded-full shrink-0">
                <Crown size={10} />
                Manager
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">{user.designation} · {user.email}</p>
          </div>
        </div>

        {/* Detail cols: row on mobile (inside first col) hidden on md, or grid cols on md */}
        <div className="flex items-center gap-2 md:contents flex-wrap pl-[42px] md:pl-0">
          <span className="text-[11px] text-slate-500 md:block">
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </span>
          <StatusPill status={user.status} />
          <span className="text-[11px] text-slate-500 md:text-right">{user.joinedAt}</span>
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
      className="relative flex md:grid md:grid-cols-[1fr_110px_90px_70px] gap-2 md:gap-3 items-start md:items-center pl-10 pr-3.5 py-2 border-t border-slate-200/70 hover:bg-slate-50/60 transition"
    >
      {/* Tree connector lines */}
      <span
        className={cn(
          'absolute left-[26px] top-0 w-px bg-slate-200',
          isLast ? 'h-1/2' : 'h-full',
        )}
      />
      <span className="absolute left-[26px] top-1/2 w-3.5 h-px bg-slate-200/70" />

      {/* Avatar + name */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[10px] font-medium shrink-0"
          style={{ backgroundColor: report.avatarColor }}
        >
          {report.initials}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-slate-900 truncate">{report.name}</p>
          <p className="text-[10.5px] text-slate-500 truncate">{report.designation}</p>
        </div>
      </div>

      {/* Detail cols */}
      <div className="flex items-center gap-2 md:contents flex-wrap">
        <span className="text-[11px] text-slate-500 capitalize">{report.type.replace('-', ' ')}</span>
        <StatusPill status={report.status} />
        <span className="text-[11px] text-slate-500 md:text-right">{report.joinedAt}</span>
      </div>
    </Link>
  );
}

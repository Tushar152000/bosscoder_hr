import Link from 'next/link';
import { Home, ChevronRight, Network, Plus } from 'lucide-react';

interface DirectoryHeaderProps {
  totalEmployees: number;
  totalManagers: number;
  totalDepts: number;
  canCreate: boolean;
}

export function DirectoryHeader({
  totalEmployees,
  totalManagers,
  totalDepts,
  canCreate,
}: DirectoryHeaderProps) {
  return (
    <div className="px-4 md:px-10 py-4 flex items-start justify-between gap-3 flex-wrap">
      <div>
        <div className="flex items-center gap-1.5 text-[13px] text-slate-400 font-medium mb-1.5">
          <Home size={14} />
          <Link href="/" className="hover:text-slate-600 md:text-[16px] text-[14px] transition">
            Home
          </Link>
          <ChevronRight size={11} />
          <span className="text-slate-900 md:text-[16px] text-[14px]">Directory</span>
        </div>
        <h1 className="text-[20px] md:text-[22px] font-semibold text-slate-900">
          Employee directory
        </h1>
        <p className="text-[12px] text-slate-500 mt-0.5">
          {totalEmployees} {totalEmployees === 1 ? 'employee' : 'employees'}
          {' · '}
          {totalManagers} {totalManagers === 1 ? 'manager' : 'managers'}
          {' · '}
          {totalDepts} {totalDepts === 1 ? 'dept' : 'depts'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/directory/tree"
          className="flex items-center gap-1.5 bg-white border border-slate-200/70 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition touch-manipulation"
        >
          <Network size={13} />
          <span className="hidden sm:inline">Org tree</span>
          <span className="sm:hidden">Tree</span>
        </Link>
        {canCreate && (
          <Link
            href="/directory/new"
            className="flex items-center gap-1.5 bg-[#0C447C] text-white rounded-lg px-3 py-2 text-[12px] font-medium hover:bg-[#0a3a6a] transition touch-manipulation"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New employee</span>
            <span className="sm:hidden">Add</span>
          </Link>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Home, ChevronRight, Network, Plus, Search } from 'lucide-react';
import { DepartmentGroup } from './department-group';
import type { DirectoryView, DirectoryDept, DirectoryManager, DirectoryPerson } from '@/types/directory';
import type { EmployeeStatus } from '@/types/employee';

type StatusFilter = EmployeeStatus | 'all';

interface Props {
  view: DirectoryView;
  totalEmployees: number;
  totalManagers: number;
  canCreate: boolean;
}

function matchesQuery(p: DirectoryPerson, q: string): boolean {
  return (
    p.name.toLowerCase().includes(q) ||
    p.email.toLowerCase().includes(q) ||
    p.designation.toLowerCase().includes(q)
  );
}

function filterDepts(
  depts: DirectoryView['departments'],
  q: string,
  deptFilter: string,
  statusFilter: StatusFilter,
): DirectoryDept[] {
  return depts
    .filter((d) => deptFilter === 'all' || d.name === deptFilter)
    .map((dept) => {
      const managers: DirectoryManager[] = dept.managers
        .filter((mgr) => {
          if (statusFilter !== 'all' && mgr.user.status !== statusFilter) return false;
          if (!q) return true;
          if (matchesQuery(mgr.user, q)) return true;
          return mgr.reports.some((r) => matchesQuery(r, q));
        })
        .map((mgr) => ({
          ...mgr,
          reports: mgr.reports
            .filter((r) => statusFilter === 'all' || r.status === statusFilter)
            .filter((r) => !q || matchesQuery(r, q)),
        }));

      const memberCount = managers.reduce((s, m) => s + 1 + m.reports.length, 0);
      return { ...dept, managers, memberCount };
    })
    .filter((d) => d.managers.length > 0);
}

export function DirectoryClient({ view, totalEmployees, totalManagers, canCreate }: Props) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const deptNames = useMemo(() => view.departments.map((d) => d.name), [view]);

  const filtered = useMemo(
    () => filterDepts(view.departments, search.toLowerCase().trim(), deptFilter, statusFilter),
    [view, search, deptFilter, statusFilter],
  );

  function clearFilters() {
    setSearch('');
    setDeptFilter('all');
    setStatusFilter('active');
  }

  return (
    <div className="py-8 space-y-6">
     
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center font-medium gap-1.5 text-[14px] text-slate-400 mb-2">
            <Home size={12} />
            <Link href="/" className="hover:text-slate-600 transition">
              Home
            </Link>
            <ChevronRight size={11} />
            <span className="text-slate-900">Directory</span>
          </div>
          <h1 className="text-[22px] font-medium text-slate-900">Employee directory</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {totalEmployees} {totalEmployees === 1 ? 'employee' : 'employees'}
            {' · '}
            {totalManagers} {totalManagers === 1 ? 'manager' : 'managers'}
            {' · '}
            {view.departments.length} {view.departments.length === 1 ? 'department' : 'departments'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Link
            href="/directory/tree"
            className="flex items-center gap-1.5 bg-white border border-slate-200/70 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-900 hover:bg-slate-50 transition"
          >
            <Network size={13} />
            Org tree
          </Link>
          {canCreate && (
            <Link
              href="/directory/new"
              className="flex items-center gap-1.5 bg-[#0C447C] text-white rounded-lg px-3 py-1.5 text-[12px] font-medium hover:bg-[#0a3a6a] transition"
            >
              <Plus size={13} />
              New employee
            </Link>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or designation"
            className="w-full h-9 bg-white border border-slate-200/70 rounded-lg pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[#0C447C]/30 focus:border-[#0C447C]/50 transition"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 bg-white border border-slate-200/70 rounded-lg px-3 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-[#0C447C]/30 cursor-pointer"
        >
          <option value="all">All departments</option>
          {deptNames.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 bg-white border border-slate-200/70 rounded-lg px-3 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-[#0C447C]/30 cursor-pointer"
        >
          <option value="active">Active</option>
          <option value="all">All statuses</option>
          <option value="on-notice">On notice</option>
          <option value="left">Left</option>
        </select>
      </div>

      {/* Department sections */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-lg p-8 text-center">
          <p className="text-[12px] text-slate-500">No employees match your filters</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-[12px] text-[#0C447C] underline underline-offset-2 mt-1.5 inline-block"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((dept) => (
            <DepartmentGroup key={dept.id} dept={dept} />
          ))}
        </div>
      )}
    </div>
  );
}

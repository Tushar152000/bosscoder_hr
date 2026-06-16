'use client';

import { useState, useMemo, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { DepartmentGroup } from './department-group';
import { DirectoryHeader } from './directory-header';
import type { DirectoryView, DirectoryDept, DirectoryManager, DirectoryPerson } from '@/types/directory';
import type { EmployeeStatus } from '@/types/employee';
import { cn } from '@/lib/utils';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deptNames = useMemo(() => view.departments.map((d) => d.name), [view]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filterDepts(view.departments, search.toLowerCase().trim(), deptFilter, statusFilter),
    [view, search, deptFilter, statusFilter],
  );

  const isFiltered = deptFilter !== 'all' || statusFilter !== 'active';

  function clearFilters() {
    setSearch('');
    setDeptFilter('all');
    setStatusFilter('active');
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* ── Fixed header + search ────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-slate-200/70">
        <DirectoryHeader
          totalEmployees={totalEmployees}
          totalManagers={totalManagers}
          totalDepts={view.departments.length}
          canCreate={canCreate}
        />

        <div className="px-4 md:px-10 pb-4 space-y-2">
          {/* Search row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or role…"
                className="w-full h-11 sm:h-9 bg-white border border-slate-200/70 rounded-lg pl-9 pr-3 text-[16px] sm:text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[#0C447C]/30 focus:border-[#0C447C]/50 transition"
              />
            </div>

            {/* Filter toggle (mobile) */}
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                'sm:hidden flex items-center justify-center w-11 h-11 rounded-lg border transition touch-manipulation relative',
                filtersOpen || isFiltered
                  ? 'bg-[#EBF3FE] border-[#B5D4F4] text-[#0C447C]'
                  : 'bg-white border-slate-200/70 text-slate-600',
              )}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal size={16} />
              {isFiltered && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0C447C]" />
              )}
            </button>

            {/* Filters inline (desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 bg-white border border-slate-200/70 rounded-lg px-3 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-[#0C447C]/30 cursor-pointer"
              >
                <option value="all">All departments</option>
                {deptNames.map((d) => <option key={d} value={d}>{d}</option>)}
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
          </div>

          {/* Mobile filter row — shown when toggled */}
          {filtersOpen && (
            <div className="sm:hidden grid grid-cols-2 gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-11 w-full bg-white border border-slate-200/70 rounded-lg px-3 text-[15px] text-slate-700 outline-none focus:ring-1 focus:ring-[#0C447C]/30"
              >
                <option value="all">All departments</option>
                {deptNames.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-11 w-full bg-white border border-slate-200/70 rounded-lg px-3 text-[15px] text-slate-700 outline-none focus:ring-1 focus:ring-[#0C447C]/30"
              >
                <option value="active">Active</option>
                <option value="all">All statuses</option>
                <option value="on-notice">On notice</option>
                <option value="left">Left</option>
              </select>
            </div>
          )}

          {/* Active filter chips */}
          {isFiltered && (
            <div className="flex flex-wrap items-center gap-1.5">
              {deptFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0C447C] bg-[#EBF3FE] border border-[#B5D4F4] px-2 py-0.5 rounded-full">
                  {deptFilter}
                  <button type="button" onClick={() => setDeptFilter('all')} className="ml-0.5 hover:text-[#0a3a6a]"><X size={10} /></button>
                </span>
              )}
              {statusFilter !== 'active' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full capitalize">
                  {statusFilter === 'all' ? 'All statuses' : statusFilter.replace('-', ' ')}
                  <button type="button" onClick={() => setStatusFilter('active')} className="ml-0.5 hover:text-slate-800"><X size={10} /></button>
                </span>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable department list ───────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={() => setFiltersOpen(false)}
        className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-5"
      >
        {filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
            <p className="text-[13px] text-slate-500">No employees match your filters</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] text-[#0C447C] underline underline-offset-2 mt-2 inline-block"
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

    </div>
  );
}

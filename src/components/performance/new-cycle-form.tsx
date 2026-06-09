'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, ChevronDown, FlaskConical, Search, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { buildCycleName } from '@/types/review';
import { createCycleAction, createTestCycleAction } from '@/app/(app)/performance/actions';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 1 + i);

export interface EmployeeOption {
  employeeId: string;
  displayName: string;
  email: string;
  department: string;
  designation: string;
}

interface Props {
  defaultYear: number;
  defaultQuarter: number;
  employees: EmployeeOption[];
}

type Mode = 'full' | 'test';

export function NewCycleForm({ defaultYear, defaultQuarter, employees }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>('full');
  const [quarter, setQuarter] = useState<number>(defaultQuarter);
  const [year, setYear] = useState<number>(defaultYear);
  const [dueDate, setDueDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Test mode state
  const [empSearch, setEmpSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedEmps = useMemo(
    () => employees.filter((e) => selectedIds.has(e.employeeId)),
    [employees, selectedIds],
  );

  const filteredEmps = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return [];
    return employees
      .filter((e) => !selectedIds.has(e.employeeId))
      .filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [empSearch, employees, selectedIds]);

  const previewName = useMemo(
    () =>
      mode === 'test'
        ? `Test – Q${quarter} ${year}`
        : buildCycleName({ cadence: 'quarterly', month: null, quarter, year }),
    [mode, quarter, year],
  );

  function addEmp(emp: EmployeeOption) {
    setSelectedIds((prev) => new Set([...prev, emp.employeeId]));
    setEmpSearch('');
    setDropdownOpen(false);
    searchRef.current?.focus();
  }

  function removeEmp(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (mode === 'full') {
        const res = await createCycleAction({
          cadence: 'quarterly',
          month: null,
          quarter,
          year,
          dueDate: dueDate || null,
        });
        if (!res.ok) { setError(res.error); return; }
        router.push(`/performance/cycles/${res.data.cycleId}`);
        router.refresh();
      } else {
        if (selectedIds.size === 0) { setError('Select at least one employee'); return; }
        const res = await createTestCycleAction({
          quarter,
          year,
          dueDate: dueDate || null,
          employeeIds: [...selectedIds],
        });
        if (!res.ok) { setError(res.error); return; }
        router.push(`/performance/cycles/${res.data.cycleId}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {/* ── Mode tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-lg w-fit">
        <TabBtn active={mode === 'full'} onClick={() => setMode('full')}>
          <CalendarPlus className="h-3.5 w-3.5" />
          Full cycle
        </TabBtn>
        <TabBtn active={mode === 'test'} onClick={() => setMode('test')}>
          <FlaskConical className="h-3.5 w-3.5" />
          Test cycle
        </TabBtn>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        {/* ── Left card ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-card">

          <div className="mb-4 flex items-center gap-2.5 border-b border-[#E2E8F0] pb-3">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#EBF3FE]">
              {mode === 'test'
                ? <FlaskConical className="h-[15px] w-[15px] text-[#0C447C]" />
                : <CalendarPlus className="h-[15px] w-[15px] text-[#0C447C]" />}
            </div>
            <div>
              <p className="text-[14px] font-medium text-slate-900">
                {mode === 'test' ? 'Test cycle details' : 'Cycle details'}
              </p>
              <p className="text-[11px] text-slate-500">
                {mode === 'test'
                  ? 'Opens forms for selected employees only — not the whole org.'
                  : 'Pick a quarter and year — name is generated for you.'}
              </p>
            </div>
          </div>

          {/* Year + Quarter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-700">
                Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                  className="h-10 w-full appearance-none rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-700">
                Quarter <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  required
                  className="h-10 w-full appearance-none rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>Q{q}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Employee picker — test mode only */}
          {mode === 'test' && (
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-700">
                Employees <span className="text-red-500">*</span>
                <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                  ({selectedIds.size} selected)
                </span>
              </label>

              {/* Search input */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={empSearch}
                  onChange={(e) => { setEmpSearch(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  placeholder="Search by name, email or department…"
                  className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white pl-8 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
                />

                {/* Dropdown results */}
                {dropdownOpen && filteredEmps.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-[#E2E8F0] bg-white shadow-lg">
                    {filteredEmps.map((emp) => (
                      <button
                        key={emp.employeeId}
                        type="button"
                        onMouseDown={() => addEmp(emp)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F5F8FF] transition"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-medium"
                          style={{ backgroundColor: stringToColor(emp.displayName) }}
                        >
                          {emp.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 truncate">{emp.displayName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{emp.designation || emp.department}</p>
                        </div>
                        <span className="ml-auto shrink-0 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {emp.department}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected employee chips */}
              {selectedEmps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-md border border-[#E2E8F0] bg-[#FAFAF7] p-2">
                  {selectedEmps.map((emp) => (
                    <span
                      key={emp.employeeId}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-white border border-[#B5D4F4] rounded-full text-[11px] font-medium text-[#0C447C]"
                    >
                      {emp.displayName}
                      <button
                        type="button"
                        onClick={() => removeEmp(emp.employeeId)}
                        className="ml-0.5 w-4 h-4 rounded-full bg-[#EBF3FE] inline-flex items-center justify-center hover:bg-[#D5E6F7] transition"
                      >
                        <X className="w-2.5 h-2.5 text-[#0C447C]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Due date */}
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-700">
              Submission due date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
            />
          </div>

          {/* Preview name */}
          <div className="mt-4 flex items-center gap-2 rounded-md border border-[#B5D4F4] bg-[#EBF3FE] px-3 py-2">
            <Sparkles className="h-[13px] w-[13px] shrink-0 text-[#0C447C]" />
            <p className="text-[12px] text-[#185FA5]">
              Cycle name will be{' '}
              <strong className="font-medium text-[#0C447C]">{previewName}</strong>.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-md border border-[#FAC8C6] bg-[#FAECE7] px-3 py-2.5 text-[12px] text-[#993C1D]">
              {error}
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card lg:sticky lg:top-6 lg:self-start h-full">
          <p className="mb-3 text-[10px] font-medium tracking-[1px] text-slate-400 uppercase">
            What happens next
          </p>
          <ol className="flex flex-col gap-2.5">
            {(mode === 'full'
              ? [
                  <>Cycle is created in <strong className="font-medium">Draft</strong> state.</>,
                  <>You&apos;ll land on the cycle page where you can review and open it.</>,
                  <>Opening assigns forms to every active employee and their manager, and sends an email notification.</>,
                ]
              : [
                  <>A test cycle is created and <strong className="font-medium">opened immediately</strong>.</>,
                  <>Forms are assigned only to the <strong className="font-medium">{selectedIds.size || '—'} selected employee{selectedIds.size !== 1 ? 's' : ''}</strong> and their managers.</>,
                  <>No org-wide emails are sent. You can delete the cycle after testing.</>,
                ]
            ).map((text, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[12px] font-medium text-[#0C447C]">
                  {i + 1}
                </span>
                <span className="text-[14px] leading-snug text-slate-700">{text}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-col gap-2 border-t border-[#E2E8F0] pt-4">
            <Button
              type="submit"
              variant="primary"
              className={cn('w-full', mode === 'test' && 'bg-amber-600 hover:bg-amber-700')}
              isLoading={isPending}
            >
              {!isPending && (mode === 'test' ? 'Create test cycle' : 'Create cycle')}
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/performance">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-medium transition',
        active ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  );
}

// Deterministic colour from a string (same logic as colorForName)
function stringToColor(name: string): string {
  const COLORS = ['#5B8DEF','#E17055','#00B894','#A29BFE','#FD79A8','#FDCB6E','#6C5CE7','#00CEC9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

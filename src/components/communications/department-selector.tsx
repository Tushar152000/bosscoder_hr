'use client';

import { useState } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Department {
  name: string;
  count: number;
}

interface Props {
  departments: Department[];
  selectedDepts: Set<string>;
  recipientsCount: number;
  onToggle: (dept: string) => void;
  onToggleAll: () => void;
}

export function DepartmentSelector({
  departments,
  selectedDepts,
  recipientsCount,
  onToggle,
  onToggleAll,
}: Props) {
  const [open, setOpen] = useState(true);
  const allSelected = selectedDepts.size === departments.length && departments.length > 0;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden self-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0] hover:bg-slate-50 active:bg-slate-100 transition touch-manipulation"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 text-[#0C447C] shrink-0" />
          <span className="text-[14px] font-semibold text-slate-900">Departments</span>
          {selectedDepts.size > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#0C447C] text-white text-[10px] font-bold shrink-0">
              {selectedDepts.size}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>

      {!open && selectedDepts.size > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-[#F1F5F9] bg-[#FAFAF7]">
          {[...selectedDepts].map((d) => (
            <span key={d} className="inline-flex items-center text-[11px] font-medium text-[#0C447C] bg-[#EBF3FE] border border-[#B5D4F4] px-2 py-0.5 rounded-full">
              {d}
            </span>
          ))}
        </div>
      )}

      {open && (
        <>
          <div className="px-4 py-2.5 border-b border-[#F1F5F9] flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleAll}
              className="text-[12px] font-medium text-[#0C447C] active:opacity-70 touch-manipulation"
            >
              {allSelected ? 'Deselect all' : 'Select all departments'}
            </button>
            {selectedDepts.size > 0 && (
              <span className="text-[11px] text-slate-400">
                {recipientsCount} recipient{recipientsCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="divide-y divide-[#F1F5F9] max-h-[260px] sm:max-h-[380px] overflow-y-auto overscroll-contain">
            {departments.map((dept) => {
              const checked = selectedDepts.has(dept.name);
              return (
                <label
                  key={dept.name}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 sm:py-2.5 cursor-pointer hover:bg-[#F5F8FF] active:bg-[#EBF3FE] transition select-none touch-manipulation',
                    checked && 'bg-[#EBF3FE]',
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 sm:w-4 sm:h-4 rounded border flex items-center justify-center shrink-0 transition',
                      checked ? 'bg-[#0C447C] border-[#0C447C]' : 'border-slate-300 bg-white',
                    )}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <input type="checkbox" checked={checked} onChange={() => onToggle(dept.name)} className="sr-only" />
                  </div>
                  <span className={cn('flex-1 text-[14px] sm:text-[13px]', checked ? 'font-semibold text-slate-900' : 'text-slate-700')}>
                    {dept.name}
                  </span>
                  <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                    {dept.count}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

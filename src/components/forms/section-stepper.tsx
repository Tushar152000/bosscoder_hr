'use client';

import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionItem {
  id: string;
  label: string;
  locked?: boolean;
}

interface Props {
  sections: SectionItem[];
  activeId: string;
  completedIds: Set<string>;
  onSelect: (id: string) => void;
}

export function SectionStepper({ sections, activeId, completedIds, onSelect }: Props) {
  return (
    <div className="sticky top-20">
      <p className="text-[12px] font-medium tracking-[1.2px] text-slate-400 mb-2">SECTIONS</p>
      <div className="flex flex-col gap-0.5">
        {sections.map((s, i) => {
          const isActive = s.id === activeId;
          const isDone = completedIds.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition w-full',
                isActive ? 'bg-[#E6F1FB]' : 'hover:bg-slate-50',
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0',
                  isDone ? 'bg-[#0F6E56] text-white' : isActive ? 'bg-[#0C447C] text-white' : 'bg-white border border-slate-200/70 text-slate-500',
                )}
              >
                {isDone ? <Check size={10} strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[14px] flex-1 text-left',
                  isActive ? 'text-[#0C447C] font-medium' : isDone ? 'text-slate-700' : 'text-slate-500',
                )}
              >
                {s.label}
              </span>
              {s.locked && !isDone && <Lock size={10} className="text-slate-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 bg-white border border-slate-200/70 rounded-md p-2.5">
        <p className="text-[12px] tracking-[1px] text-slate-400 mb-1.5">PROGRESS</p>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-[#0C447C] rounded-full transition-all duration-300"
            style={{ width: `${(completedIds.size / sections.length) * 100}%` }}
          />
        </div>
        <p className="text-[12px] text-slate-500">
          {completedIds.size} of {sections.length} sections
        </p>
      </div>
    </div>
  );
}

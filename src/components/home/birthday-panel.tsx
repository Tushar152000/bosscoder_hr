'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, PartyPopper } from 'lucide-react';
import { initials } from '@/lib/utils';

interface BirthdayEntry {
  id: string;
  name: string;
  department?: string;
  daysUntil: number;
}

interface BirthdayPanelProps {
  entries: BirthdayEntry[];
}

const AVATAR_COLORS = [
  { bg: '#E6F1FB', color: '#0C447C' },
  { bg: '#faeeda', color: '#633806' },
  { bg: '#e1f5ee', color: '#085041' },
  { bg: '#eeedfe', color: '#3c3489' },
  { bg: '#fbeaf0', color: '#72243e' },
];

function DaysBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil === 0)
    return (
      <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-100 whitespace-nowrap">
        Today 🎉
      </span>
    );
  if (daysUntil === 1)
    return (
      <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">
        Tomorrow
      </span>
    );
  if (daysUntil <= 7)
    return (
      <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
        In {daysUntil} days
      </span>
    );
  return (
    <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">
      In {daysUntil} days
    </span>
  );
}

const PREVIEW_COUNT = 3;

export function BirthdayPanel({ entries }: BirthdayPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="px-4 py-5 flex flex-col items-center gap-2 text-center">
        <span className="text-2xl">🎈</span>
        <p className="text-[11px] text-slate-400">No birthdays in the next 14 days</p>
      </div>
    );
  }

  const todayEntries = entries.filter((e) => e.daysUntil === 0);
  const visible = expanded ? entries : entries.slice(0, PREVIEW_COUNT);
  const hiddenCount = entries.length - PREVIEW_COUNT;

  return (
    <div className="px-3 pb-3">
      {/* Today celebration banner */}
      {todayEntries.length > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-pink-50 border border-pink-100 px-3 py-2">
          <PartyPopper className="w-3.5 h-3.5 text-pink-500 shrink-0" />
          <p className="text-[11px] font-semibold text-pink-700 leading-snug">
            {todayEntries.map((e) => e.name.split(' ')[0]).join(', ')}{' '}
            {todayEntries.length === 1 ? 'celebrates' : 'celebrate'} today!
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-0.5">
        {visible.map((entry, i) => {
          const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const isToday = entry.daysUntil === 0;
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors ${
                isToday ? 'bg-pink-50/60' : 'hover:bg-slate-50'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border"
                style={{
                  background: c.bg,
                  color: c.color,
                  borderColor: c.bg,
                }}
              >
                {initials(entry.name, '')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight">
                  {entry.name}
                </p>
                {entry.department && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{entry.department}</p>
                )}
              </div>
              <DaysBadge daysUntil={entry.daysUntil} />
            </div>
          );
        })}
      </div>

      {/* Show more / less toggle */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-[#0C447C] hover:bg-[#EEF5FF] transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              See {hiddenCount} more {hiddenCount === 1 ? 'birthday' : 'birthdays'}
            </>
          )}
        </button>
      )}
    </div>
  );
}

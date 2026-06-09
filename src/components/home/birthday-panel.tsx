'use client';

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
  { bg: '#e6f1fb', color: '#0c447c' },
  { bg: '#faeeda', color: '#633806' },
  { bg: '#e1f5ee', color: '#085041' },
  { bg: '#eeedfe', color: '#3c3489' },
  { bg: '#fbeaf0', color: '#72243e' },
];

function PillLabel({ daysUntil }: { daysUntil: number }) {
  if (daysUntil === 0)
    return (
      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-800 whitespace-nowrap">
        Today
      </span>
    );
  if (daysUntil <= 7)
    return (
      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 whitespace-nowrap">
        In {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
      </span>
    );
  return (
    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
      In {daysUntil} days
    </span>
  );
}

export function BirthdayPanel({ entries }: BirthdayPanelProps) {
  const todayCount = entries.filter((e) => e.daysUntil === 0).length;

  return (
    <div className="py-4 border-b border-slate-100 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🎂</span>
          <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-slate-400">
            Birthdays
          </span>
          {todayCount > 0 && (
            <span className="text-[9px] font-semibold bg-pink-50 text-pink-800 px-1.5 py-0.5 rounded-md">
              {todayCount} today
            </span>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-[11px] text-slate-400 text-center py-3">
          No birthdays in the next 14 days
        </p>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry, i) => {
            const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <div
                key={entry.id}
                className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-0 last:pb-0"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                  style={{ background: c.bg, color: c.color }}
                >
                  {initials(entry.name, '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-900 truncate">{entry.name}</p>
                  {entry.department && (
                    <p className="text-[10px] text-slate-400">{entry.department}</p>
                  )}
                </div>
                <PillLabel daysUntil={entry.daysUntil} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

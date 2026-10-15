'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDaysISO, isSundayISO } from '@/lib/leave-days';

interface Props {
  /** Selected leave days, sorted (never Sundays or already-taken days). */
  value: string[];
  onChange: (dates: string[]) => void;
  /** Half-day leave: one day, each tap replaces it. */
  single?: boolean;
  /** Earliest pickable day (YYYY-MM-DD). */
  minDate: string;
  /** Days that already have a pending or approved leave — skipped, not pickable. */
  taken: Map<string, 'pending' | 'approved'>;
  /** Fired when the first day of a range is waiting for its last day. */
  onPendingChange?: (pending: boolean) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n: number) => String(n).padStart(2, '0');

type YM = { y: number; m: number };
const nextMonth = ({ y, m }: YM, delta = 1): YM => {
  const n = m - 1 + delta;
  return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 + 1 };
};

/**
 * Range calendar for leave, in the style of a date-range picker: tap the first day,
 * then the last day, and every working day in between is selected (Sundays and days
 * already on leave are skipped). Tap the same day twice for a single day; a third tap
 * starts over.
 */
export function LeaveDatePicker({ value, onChange, single = false, minDate, taken, onPendingChange }: Props) {
  const start = value[0] ?? minDate;
  const [view, setView] = useState<YM>({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) });
  const [anchor, setAnchorState] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const setAnchor = (d: string | null) => {
    setAnchorState(d);
    onPendingChange?.(d !== null);
  };

  const blocked = (d: string) => d < minDate || isSundayISO(d) || taken.has(d);

  /** Pickable days between a and b, inclusive. */
  function span(a: string, b: string): string[] {
    const [from, to] = a <= b ? [a, b] : [b, a];
    const out: string[] = [];
    for (let d = from; d <= to; d = addDaysISO(d, 1)) if (!blocked(d)) out.push(d);
    return out;
  }

  function pick(d: string) {
    if (blocked(d)) return;
    if (single) { onChange([d]); return; }
    if (!anchor) {
      setAnchor(d);
      onChange([d]);
    } else {
      onChange(span(anchor, d));
      setAnchor(null);
      setHover(null);
    }
  }

  // While the last day is being chosen, show the range under the pointer.
  const previewing = !!anchor && !!hover;
  const shown = new Set(previewing ? span(anchor!, hover!) : value);
  const ends = previewing
    ? [anchor! <= hover! ? anchor! : hover!, anchor! <= hover! ? hover! : anchor!]
    : [value[0], value[value.length - 1]];
  // A Sunday with picked days on both sides sits inside the band (greyed, not counted).
  const inRun = (d: string) =>
    shown.has(d) || (isSundayISO(d) && shown.has(addDaysISO(d, -1)) && shown.has(addDaysISO(d, 1)));

  const canGoBack = `${view.y}-${pad(view.m)}` > minDate.slice(0, 7);

  function renderMonth(ym: YM) {
    const daysInMonth = new Date(Date.UTC(ym.y, ym.m, 0)).getUTCDate();
    const lead = new Date(Date.UTC(ym.y, ym.m - 1, 1)).getUTCDay();
    const cells: (string | null)[] = [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => `${ym.y}-${pad(ym.m)}-${pad(i + 1)}`),
    ];
    const navBtn = 'grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent';

    return (
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex h-9 items-center justify-between">
          <button type="button" onClick={() => setView((v) => nextMonth(v, -1))} disabled={!canGoBack} aria-label="Previous month" className={navBtn}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-[13px] font-semibold text-zinc-800">{MONTHS[ym.m - 1]} {ym.y}</p>
          <button type="button" onClick={() => setView((v) => nextMonth(v, 1))} aria-label="Next month" className={navBtn}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={cn('pb-1 text-[11px] font-medium', i === 0 ? 'text-zinc-300' : 'text-zinc-400')}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className="h-10" />;
            const sunday = isSundayISO(d);
            const past = d < minDate;
            const takenAs = taken.get(d);
            const on = shown.has(d);
            const isEnd = on && (d === ends[0] || d === ends[1]);
            const run = inRun(d);
            const col = i % 7;
            // The band joins neighbours and gets rounded ends where it wraps a row or month.
            const prevIn = run && inRun(addDaysISO(d, -1));
            const nextIn = run && inRun(addDaysISO(d, 1));
            return (
              <div key={d} className="relative flex h-10 items-center justify-center">
                {run && (prevIn || nextIn) && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-[3px] bg-[#EBF3FE]',
                      !prevIn ? 'left-1/2' : col === 0 || i === lead ? 'left-0.5 rounded-l-full' : 'left-0',
                      !nextIn ? 'right-1/2' : col === 6 || i === cells.length - 1 ? 'right-0.5 rounded-r-full' : 'right-0',
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => pick(d)}
                  onMouseEnter={() => anchor && setHover(d)}
                  disabled={sunday || past || !!takenAs}
                  aria-pressed={on}
                  aria-label={`${parseInt(d.slice(8), 10)} ${MONTHS[ym.m - 1]}${sunday ? ', Sunday (off)' : ''}${takenAs ? `, leave already ${takenAs}` : ''}`}
                  title={sunday ? 'Sunday — weekly off' : takenAs ? `Leave already ${takenAs}` : undefined}
                  className={cn(
                    'relative flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] tabular-nums transition-colors',
                    isEnd && 'bg-[#0C447C] font-semibold text-white shadow-sm',
                    on && !isEnd && 'font-medium text-[#0C447C] hover:bg-[#D6E6FB]',
                    !on && !sunday && !past && !takenAs && 'text-zinc-700 hover:bg-zinc-100',
                    !on && !past && d === minDate && 'ring-1 ring-inset ring-zinc-300',
                    (sunday || past) && 'cursor-not-allowed text-zinc-300',
                    sunday && run && 'text-[#9DB4D3]',
                    takenAs && 'cursor-not-allowed text-zinc-400',
                  )}
                >
                  {parseInt(d.slice(8), 10)}
                  {takenAs && (
                    <span className={cn('absolute bottom-0.5 h-1 w-1 rounded-full', takenAs === 'approved' ? 'bg-[#1D9E75]' : 'bg-[#D85A30]')} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-3" onMouseLeave={() => setHover(null)}>
      {renderMonth(view)}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400">
        <span>Sundays are off</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#D85A30]" />Applied</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />Approved</span>
      </div>
    </div>
  );
}

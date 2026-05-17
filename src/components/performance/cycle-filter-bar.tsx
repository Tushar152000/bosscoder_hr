'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { MONTH_OPTIONS } from '@/lib/performance/cycle-period';

interface Props {
  /** Years to offer in the dropdown. Newest first. */
  years: number[];
  /** Cycles matching the active filter — for the inline result count. */
  matchedCycleCount: number;
  /** Total cycles available (unfiltered) — to know whether to render at all. */
  totalCycleCount: number;
}

export function CycleFilterBar({ years, matchedCycleCount, totalCycleCount }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const year = sp.get('year') ?? '';
  const month = sp.get('month') ?? '';
  const isFiltered = Boolean(year || month);

  if (totalCycleCount === 0) return null;

  function update(key: 'year' | 'month', value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(`/performance${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  function reset() {
    const params = new URLSearchParams(sp.toString());
    params.delete('year');
    params.delete('month');
    const qs = params.toString();
    router.push(`/performance${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-default bg-card px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        <Filter className="h-3.5 w-3.5" />
        Filter by cycle
      </span>
      <Select
        value={year}
        onChange={(e) => update('year', e.target.value)}
        className="h-8 w-32"
        aria-label="Filter by year"
      >
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      <Select
        value={month}
        onChange={(e) => update('month', e.target.value)}
        className="h-8 w-36"
        aria-label="Filter by month"
      >
        <option value="">All months</option>
        {MONTH_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      {isFiltered && (
        <>
          <span className="ml-1 text-xs text-muted">
            {matchedCycleCount} {matchedCycleCount === 1 ? 'cycle' : 'cycles'} match
          </span>
          <button
            type="button"
            onClick={reset}
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-muted ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </>
      )}
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import { Select } from '@/components/ui/select';

interface Props {
  years: number[];
  matchedCycleCount: number;
  totalCycleCount: number;
}

export function CycleFilterBar({ years, matchedCycleCount, totalCycleCount }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const year = sp.get('year') ?? '';
  const isFiltered = Boolean(year);

  if (totalCycleCount === 0) return null;

  function update(value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set('year', value);
    else params.delete('year');
    params.delete('month');
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
        onChange={(e) => update(e.target.value)}
        className="h-8 w-32"
        aria-label="Filter by year"
      >
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
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

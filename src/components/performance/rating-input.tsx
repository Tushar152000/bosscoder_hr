'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  value: number;
  onChange: (n: number) => void;
  /** Use whole numbers only (1–5). Self-eval ratings use this. */
  integer?: boolean;
  disabled?: boolean;
  id?: string;
}

/**
 * 1–5 rating control. 1 = best, 5 = worst.
 * Manager ratings allow decimals (step 0.1); self-eval ratings are integer.
 */
export function RatingInput({
  value,
  onChange,
  integer = false,
  disabled,
  id,
}: RatingInputProps) {
  const step = integer ? 1 : 0.1;
  const buckets = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {buckets.map((n) => {
          const active = Math.round(value) === n;
          return (
            <button
              type="button"
              key={n}
              onClick={() => !disabled && onChange(n)}
              disabled={disabled}
              className={cn(
                'h-9 w-9 rounded-md border text-sm font-semibold transition-colors',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-default bg-card text-white hover:border-white/20 hover:bg-white/[0.04]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={`Set rating to ${n}`}
            >
              {n}
            </button>
          );
        })}
        <input
          id={id}
          type="number"
          min={1}
          max={5}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!Number.isNaN(n)) onChange(Math.min(5, Math.max(1, n)));
          }}
          disabled={disabled}
          className="ml-2 h-9 w-20 rounded-md border border-default bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <p className="text-xs text-muted">
        1 = best · 5 = worst
        {!integer && ' · decimals allowed'}
      </p>
    </div>
  );
}

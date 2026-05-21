'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  value: number;
  onChange: (n: number) => void;
  integer?: boolean;
  disabled?: boolean;
  id?: string;
}

export function RatingInput({ value, onChange, integer = false, disabled, id }: RatingInputProps) {
  const step = integer ? 1 : 0.1;
  const buckets = [1, 2, 3, 4, 5];

  const BUCKET_COLOR: Record<number, string> = {
    1: 'border-[#A4DFC4] bg-[#E1F5EE] text-[#0F6E56]',
    2: 'border-[#A4DFC4] bg-[#E1F5EE] text-[#0F6E56]',
    3: 'border-[#CBD5E1] bg-[#F8FAFC] text-slate-600',
    4: 'border-[#FAC775] bg-[#FAEEDA] text-[#854F0B]',
    5: 'border-[#F4A48A] bg-[#FDEDE8] text-[#993C1D]',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {buckets.map((n) => {
          const active = Math.round(value) === n;
          return (
            <button
              type="button"
              key={n}
              onClick={() => !disabled && onChange(n)}
              disabled={disabled}
              className={cn(
                'h-9 w-9 rounded-lg border text-[13px] font-semibold transition-all',
                active
                  ? BUCKET_COLOR[n]
                  : 'border-[#E2E8F0] bg-white text-slate-500 hover:border-[#0C447C] hover:text-[#0C447C]',
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
          className="ml-1 h-9 w-20 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 focus:border-[#0C447C] disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <p className="text-[11px] text-slate-400">
        1 = best · 5 = worst{!integer && ' · decimals allowed'}
      </p>
    </div>
  );
}

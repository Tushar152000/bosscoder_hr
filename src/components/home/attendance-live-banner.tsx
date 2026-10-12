'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarCheck, CalendarPlus, House, PieChart, X, ArrowRight } from 'lucide-react';

const DISMISS_KEY = 'attendance-live-banner-dismissed-v1';

const FEATURES = [
  { icon: CalendarPlus, label: 'Apply for leave' },
  { icon: House, label: 'Track work-from-home' },
  { icon: PieChart, label: 'Check your balance' },
];

export function AttendanceLiveBanner() {
  // 'loading' until we've checked localStorage — avoids a flash for dismissers.
  const [state, setState] = useState<'loading' | 'show' | 'hide'>('loading');

  useEffect(() => {
    try {
      setState(localStorage.getItem(DISMISS_KEY) === '1' ? 'hide' : 'show');
    } catch {
      setState('show');
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setState('hide');
  }

  if (state !== 'show') return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#DCE7F7] bg-white py-4 pl-5 pr-4 shadow-[0_4px_20px_-8px_rgba(12,68,124,0.18)] sm:py-5 sm:pl-6 sm:pr-5">
      {/* Accent strip + soft glow */}
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#0C447C] to-[#1D9E75]" />
      <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#E1F5EE] blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5 sm:pr-8">
        {/* pr-7 on phones keeps the title clear of the dismiss button; the CTA below stays full width. */}
        <div className="flex min-w-0 flex-1 items-start gap-3.5 pr-7 sm:gap-4 sm:pr-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0C447C] to-[#2E73C4] shadow-md shadow-[#0C447C]/25 sm:h-12 sm:w-12">
            <CalendarCheck className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0F6E56] ring-1 ring-inset ring-[#9FE1CB]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D9E75] opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
                </span>
                New
              </span>
              <p className="text-[15px] font-semibold text-[#202658] sm:text-[16px]">Leave is now live</p>
            </div>

            <p className="mt-1 text-[13px] text-slate-600 sm:hidden">
              Apply for leave, track work-from-home and check your balance — all in one place.
            </p>
            <ul className="mt-2 hidden flex-wrap gap-2 sm:flex">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                >
                  <Icon className="h-3.5 w-3.5 text-[#0C447C]" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link
          href="/attendance"
          className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0C447C] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0a3a6a] active:bg-[#0a3a6a]"
        >
          Open Leave
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

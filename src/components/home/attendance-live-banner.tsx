'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, Check, Sparkles, X } from 'lucide-react';

const DISMISS_KEY = 'attendance-live-banner-dismissed-v1';

const FEATURES = ['Apply for leave', 'Track work-from-home', 'Check your balance'];

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

  const dismissButton = (className: string) => (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss"
      title="Dismiss"
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600 ${className}`}
    >
      <X className="h-4 w-4" />
    </button>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D6E4F5] bg-gradient-to-r from-[#F3F8FF] via-white to-[#EFFAF5] p-4 shadow-[0_6px_24px_-12px_rgba(12,68,124,0.25)] sm:p-5">
      {/* Decorative: soft glows + a faint dot grid fading in from the right */}
      <span className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-[#DCEBFE] opacity-70 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-[#D5F2E6] opacity-80 blur-3xl" />
      <span
        className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.35] [mask-image:linear-gradient(to_left,black,transparent)]"
        style={{ backgroundImage: 'radial-gradient(#9FB7D6 1px, transparent 1px)', backgroundSize: '14px 14px' }}
      />

      {/* Mobile dismiss (top-right); on desktop it sits beside the CTA instead */}
      {dismissButton('absolute right-2 top-2 sm:hidden')}

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3.5 pr-8 sm:items-center sm:gap-4 sm:pr-0">
          {/* Icon tile with a "new" sparkle */}
          <div className="relative shrink-0">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#0C447C] to-[#2E73C4] shadow-lg shadow-[#0C447C]/25 ring-4 ring-white sm:h-14 sm:w-14">
              <CalendarCheck className="h-6 w-6 text-white sm:h-7 sm:w-7" />
            </div>
            <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#1D9E75] text-white shadow ring-2 ring-white">
              <Sparkles className="h-3 w-3" />
            </span>
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
              <p className="text-[16px] font-bold tracking-tight text-[#202658] sm:text-[17px]">Leave is now live</p>
            </div>
            <p className="mt-0.5 text-[13px] text-slate-600">
              Apply, track work-from-home and see your balance in one place.
            </p>
            <ul className="mt-2.5 hidden flex-wrap gap-1.5 sm:flex">
              {FEATURES.map((label) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full bg-[#EBF3FE] px-2.5 py-1 text-[12px] font-medium text-[#0C447C]"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/attendance"
            className="group inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0C447C] px-5 py-3 text-[14px] font-semibold text-white shadow-md shadow-[#0C447C]/20 transition hover:bg-[#0a3a6a] active:bg-[#0a3a6a] sm:flex-none"
          >
            Open Leave
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {dismissButton('hidden sm:grid')}
        </div>
      </div>
    </div>
  );
}

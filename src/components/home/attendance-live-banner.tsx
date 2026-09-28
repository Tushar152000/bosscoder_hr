'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarCheck, X, ArrowRight } from 'lucide-react';

const DISMISS_KEY = 'attendance-live-banner-dismissed-v1';

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
    <div className="relative overflow-hidden rounded-2xl border border-[#B5D4F4] bg-gradient-to-r from-[#EBF3FE] to-[#E1F5EE] px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4 pr-8">
        <div className="hidden sm:grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
          <CalendarCheck className="h-5 w-5 text-[#0C447C]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#0F6E56] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Now live
            </span>
            <p className="text-[14px] sm:text-[15px] font-semibold text-slate-900">Attendance &amp; Leave</p>
          </div>
          <p className="mt-0.5 text-[12px] sm:text-[13px] text-slate-600">
            Apply for leave, track work-from-home, and check your leave balance — all in one place.
          </p>
        </div>
        <Link
          href="/attendance"
          className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0C447C] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0a3a6a]"
        >
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Mobile CTA */}
      <Link
        href="/attendance"
        className="mt-3 flex sm:hidden items-center justify-center gap-1.5 rounded-lg bg-[#0C447C] px-3.5 py-2.5 text-[13px] font-semibold text-white transition active:bg-[#0a3a6a]"
      >
        Open Attendance <ArrowRight className="h-3.5 w-3.5" />
      </Link>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/70 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

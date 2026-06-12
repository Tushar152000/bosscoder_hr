'use client';

import Link from 'next/link';
import { CalendarHeart, ArrowRight } from 'lucide-react';

interface Props {
  hasDob: boolean;
}

export function DobMissingBanner({ hasDob }: Props) {
  if (hasDob) return null;

  return (
    <div className="relative flex items-start gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 overflow-hidden">
      <div className="pointer-events-none absolute -right-4 -top-4 w-24 h-24 rounded-full bg-amber-100/60 blur-2xl" />

      <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
        <CalendarHeart className="w-5 h-5 text-amber-600" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-amber-900">
          Your birthday isn&apos;t on record yet 🎂
        </p>
        <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
          We&apos;d love to celebrate with you! Add your birth month and day so we can
          include you in team birthday shoutouts.
        </p>
        <Link
          href="/settings/account#dob"
          className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-800 hover:text-amber-950 transition-colors group"
        >
          Add my birthday in Settings
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

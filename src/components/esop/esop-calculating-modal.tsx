'use client';

import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';

const SESSION_KEY = 'esop_modal_seen';

interface EsopCalculatingModalProps {
  role: 'employee' | 'founder' | 'hr';
}

export function EsopCalculatingModal({ role }: EsopCalculatingModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (role !== 'employee') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);
  }, [role]);

  if (!visible) return null;

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Settings className="h-7 w-7 text-slate-500 animate-spin duration-[3000ms]" />
          </div>

          <div className="space-y-2">
            <p className="text-base font-medium text-slate-900">
              Your ESOP data is being calculated
            </p>
            <p className="text-sm text-slate-500">
              We&apos;re currently verifying and finalising your equity grants.
              Numbers may change slightly until the review is complete.
            </p>
          </div>

          <p className="text-xs text-slate-400">
            We&apos;ll notify you once everything is locked in.
          </p>

          <button
            onClick={dismiss}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Got it, show me anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// <EsopCalculatingModal role="employee" />

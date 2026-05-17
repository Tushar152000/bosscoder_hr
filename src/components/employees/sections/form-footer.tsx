'use client';

import Link from 'next/link';
import { Save } from 'lucide-react';

interface Props {
  lastSaved: Date | null;
  isReview: boolean;
  nextSectionLabel?: string;
  pending: boolean;
  onNext: () => void;
  onValidate: () => void;
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function FormFooter({ lastSaved, isReview, nextSectionLabel, pending, onNext, onValidate }: Props) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200/70 px-6 py-3 flex justify-between items-center">
      <div className="w-full max-w-[1300px] mx-auto flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <Save size={13} />
          {lastSaved ? (
            <>
              <span>Draft auto-saved</span>
              <span className="text-slate-400">· {timeAgo(lastSaved)}</span>
            </>
          ) : (
            <span className="text-slate-400">Not saved yet</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/directory"
            className="bg-white border border-slate-200/70 rounded-md px-3.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          {!isReview && (
            <button
              type="button"
              onClick={onValidate}
              className="hidden md:block bg-white border border-slate-200/70 rounded-md px-3.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Save &amp; continue
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={pending}
            className="bg-[#0C447C] text-white rounded-md px-3.5 py-1.5 text-[12px] font-medium hover:bg-[#0a3a6a] transition disabled:opacity-60"
          >
            {pending ? 'Saving…' : isReview ? 'Create employee' : `Next: ${nextSectionLabel}`}
          </button>
        </div>
      </div>
    </footer>
  );
}

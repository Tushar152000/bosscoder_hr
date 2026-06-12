'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Pencil, Check, Loader2, PartyPopper } from 'lucide-react';
import { updateDobAction } from '@/app/(app)/settings/account/actions';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month: number) {
  // Use a non-leap year for default; all months get max possible days shown
  return new Date(2001, month, 0).getDate();
}

function parseMmDd(mmdd: string | null): { month: number; day: number } | null {
  if (!mmdd) return null;
  const [mm, dd] = mmdd.split('-').map(Number);
  if (!mm || !dd) return null;
  return { month: mm, day: dd };
}

interface Props {
  dateOfBirth: string | null; // MM-DD or null
}

export function DobSection({ dateOfBirth }: Props) {
  const router = useRouter();
  const existing = parseMmDd(dateOfBirth);

  const [editing, setEditing] = useState(!existing); // open by default if not set
  const [month, setMonth] = useState(existing?.month ?? 1);
  const [day, setDay] = useState(existing?.day ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const maxDay = daysInMonth(month);
  const effectiveDay = Math.min(day, maxDay);

  function handleMonthChange(val: number) {
    setMonth(val);
    setDay((prev) => Math.min(prev, daysInMonth(val)));
  }

  function handleSave() {
    setError(null);
    const fd = new FormData();
    fd.append('month', String(month));
    fd.append('day', String(effectiveDay));

    startTransition(async () => {
      try {
        await updateDobAction(fd);
        setSaved(true);
        setEditing(false);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      }
    });
  }

  const displayLabel = existing
    ? `${MONTHS[existing.month - 1]} ${existing.day}`
    : null;

  return (
    <section id="dob" className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-20">
      <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-slate-700">Birthday</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Month and day only — used for team birthday shoutouts.
          </p>
        </div>
        {existing && !editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setSaved(false); }}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="px-4 md:px-5 py-4">
        {/* Saved confirmation */}
        {saved && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
            <PartyPopper className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[12px] font-medium text-emerald-800">
              Birthday saved! You&apos;ll now appear in team birthday shoutouts 🎉
            </p>
          </div>
        )}

        {/* Read-only display */}
        {existing && !editing && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-900">{displayLabel}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your birthday is on record. Edit to correct it.
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" /> Set
              </span>
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="space-y-4">
            {!existing && (
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
                <CalendarDays className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-800 leading-relaxed">
                  Your birthday isn&apos;t on record yet. Add it below and you&apos;ll be included in team
                  birthday shoutouts. Only the month and day are shared — never the year.
                </p>
              </div>
            )}

            <div className="flex items-end gap-3">
              {/* Month */}
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 focus:border-[#0C447C]"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Day */}
              <div className="w-24 shrink-0">
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Day
                </label>
                <select
                  value={effectiveDay}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 focus:border-[#0C447C]"
                >
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-[#0C447C] text-white hover:bg-[#0a3a6b] disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : (
                  <><Check className="w-3.5 h-3.5" /> Save</>
                )}
              </button>

              {/* Cancel (only if already has a value) */}
              {existing && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setError(null); }}
                  className="shrink-0 text-[12px] text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

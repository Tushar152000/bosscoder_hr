'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildCycleName } from '@/types/review';
import { createCycleAction } from '@/app/(app)/performance/actions';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 1 + i);

interface Props {
  defaultYear: number;
  defaultQuarter: number;
}

export function NewCycleForm({ defaultYear, defaultQuarter }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quarter, setQuarter] = useState<number>(defaultQuarter);
  const [year, setYear] = useState<number>(defaultYear);
  const [dueDate, setDueDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const previewName = useMemo(
    () => buildCycleName({ cadence: 'quarterly', month: null, quarter, year }),
    [quarter, year],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCycleAction({
        cadence: 'quarterly',
        month: null,
        quarter,
        year,
        dueDate: dueDate || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/performance/cycles/${res.data.cycleId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.6fr_1fr]">


        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-card">
    
          <div className="mb-4 flex items-center gap-2.5 border-b border-[#E2E8F0] pb-3">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#EBF3FE]">
              <CalendarPlus className="h-[15px] w-[15px] text-[#0C447C]" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-slate-900">Cycle details</p>
              <p className="text-[11px] text-slate-500">
                Pick a quarter and year — name is generated for you.
              </p>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3">

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-700">
                Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                  className="h-10 w-full appearance-none rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-700">
                Quarter <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  required
                  className="h-10 w-full appearance-none rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>Q{q}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Due date */}
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-700">
              Submission due date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
            />
            <p className="text-[11px] text-slate-400">
              If set, forms show this as the deadline instead of the end of the quarter.
            </p>
          </div>

          {/* Cycle name preview */}
          <div className="mt-4 flex items-center gap-2 rounded-md border border-[#B5D4F4] bg-[#EBF3FE] px-3 py-2">
            <Sparkles className="h-[13px] w-[13px] shrink-0 text-[#0C447C]" />
            <p className="text-[12px] text-[#185FA5]">
              Cycle name will be{' '}
              <strong className="font-medium text-[#0C447C]">{previewName}</strong>.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-md border border-[#FAC8C6] bg-[#FAECE7] px-3 py-2.5 text-[12px] text-[#993C1D]">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card lg:sticky lg:top-6 lg:self-start h-full">
          <p className="mb-3 text-[10px] font-medium tracking-[1px] text-slate-400 uppercase">
            What happens next
          </p>
          <ol className="flex flex-col gap-2.5">
            {[
              <>Cycle is created in <strong className="font-medium">Draft</strong> state.</>,
              <>You&apos;ll land on the cycle page where you can review and open it.</>,
              <>Opening assigns forms to every active employee and their manager, and sends an email notification.</>,
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[12px] font-medium text-[#0C447C]">
                  {i + 1}
                </span>
                <span className="text-[14px] leading-snug text-slate-700">{text}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-col gap-2 border-t border-[#E2E8F0] pt-4">
            <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>
              {!isPending && 'Create cycle'}
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/performance">Cancel</Link>
            </Button>
          </div>
        </div>

      </div>
    </form>
  );
}

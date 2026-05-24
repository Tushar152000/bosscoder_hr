'use client';

import { cn } from '@/lib/utils';
import { formatDateObj, vestingStatus } from '@/lib/esop/formatters';
import type { VestingMilestone } from '@/types/esop';

interface Props {
  grantDate: Date;
  vestingSchedule: VestingMilestone[];
  sharesGranted: number;
}

export function VestingTimeline({ grantDate, vestingSchedule, sharesGranted }: Props) {
  const now = new Date();
  const allMilestones = [
    { date: grantDate, shares: 0, isGrant: true },
    ...vestingSchedule.map((m) => ({ ...m, isGrant: false })),
  ];

  const done = vestingSchedule.filter((m) => m.date <= now).length;
  const total = vestingSchedule.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusConfig = {
    done: { dot: 'bg-[#0C447C] border-[#0C447C]', label: 'bg-[#E1F5EE] text-[#27500A]', text: 'Vested' },
    next: { dot: 'bg-white border-[#0C447C] ring-2 ring-[#0C447C]/20', label: 'bg-[#EBF3FE] text-[#0C447C]', text: 'Next' },
    future: { dot: 'bg-white border-[#CBD5E1]', label: 'bg-[#F8FAFC] text-[#64748b]', text: 'Upcoming' },
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#0f172a]">Vesting timeline</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">{done} of {total} tranches vested</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          {(['done','next','future'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[#64748b]">
              <span className={cn('w-2.5 h-2.5 rounded-full border-2', statusConfig[s].dot)} />
              {statusConfig[s].text}
            </span>
          ))}
        </div>
      </div>

      {/* Progress rail */}
      <div className="relative">
        <div className="h-1 bg-[#E2E8F0] rounded-full" />
        <div className="absolute top-0 left-0 h-1 bg-[#0C447C] rounded-full transition-all" style={{ width: `${pct}%` }} />

        {/* Milestone dots */}
        <div className="flex justify-between mt-0 relative" style={{ marginTop: '-4px' }}>
          {allMilestones.map((m, i) => {
            const st = m.isGrant ? 'done' : vestingStatus(m.date, now);
            const cfg = statusConfig[st];
            return (
              <div key={i} className="flex flex-col items-center gap-2" style={{ width: `${100 / allMilestones.length}%` }}>
                <div className={cn('w-3 h-3 rounded-full border-2 mx-auto transition-all', cfg.dot)} />
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-medium text-[#0f172a] whitespace-nowrap">
                    {formatDateObj(m.date)}
                  </p>
                  {m.isGrant ? (
                    <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EBF3FE] text-[#0C447C]">
                      Grant
                    </span>
                  ) : (
                    <>
                      <p className="text-[10px] text-[#64748b]">{m.shares} shares</p>
                      <span className={cn('inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full', cfg.label)}>
                        {cfg.text}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-[#64748b] border-t border-[#E2E8F0] pt-4">
        Vesting condition: continued employment + performance rating ≤ 3 on each vesting date.
      </p>
    </div>
  );
}

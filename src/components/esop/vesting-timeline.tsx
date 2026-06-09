'use client';

import { cn } from '@/lib/utils';
import { formatDateObj, vestingStatus } from '@/lib/esop/formatters';
import type { VestingMilestone } from '@/types/esop';

type Status = 'done' | 'next' | 'future' | 'grant';

const STATUS_CONFIG: Record<Status, { dot: string; badge: string; label: string }> = {
  grant: {
    dot: 'bg-[#0C447C] border-[#0C447C]',
    badge: 'bg-[#EBF3FE] text-[#0C447C]',
    label: 'Grant',
  },
  done: {
    dot: 'bg-[#0C447C] border-[#0C447C] shadow-[0_0_0_3px_rgba(12,68,124,0.10)]',
    badge: 'bg-[#EAF3DE] text-[#27500A]',
    label: 'Vested',
  },
  next: {
    dot: 'bg-[#EBF3FE] border-[#0C447C] shadow-[0_0_0_4px_rgba(12,68,124,0.12)]',
    badge: 'bg-[#EBF3FE] text-[#0C447C]',
    label: 'Next',
  },
  future: {
    dot: 'bg-white border-[#CBD5E1]',
    badge: 'bg-[#F1F5F9] text-[#94a3b8]',
    label: 'Upcoming',
  },
};

interface Props {
  grantDate: Date;
  vestingSchedule: VestingMilestone[];
  sharesGranted: number;
  perShareValue?: number;
}

export function VestingTimeline({
  grantDate,
  vestingSchedule,
  sharesGranted,
  perShareValue = 0,
}: Props) {
  const now = new Date();

  const allMilestones = [
    { date: grantDate, shares: 0, isGrant: true },
    ...vestingSchedule.map((m) => ({ ...m, isGrant: false })),
  ];

  const done = vestingSchedule.filter((m) => m.date <= now).length;
  const total = vestingSchedule.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const railPct = done > 0 ? Math.round((done / (allMilestones.length - 1)) * 100) : 0;

  const vestedShares = vestingSchedule
    .filter((m) => m.date <= now)
    .reduce((s, m) => s + m.shares, 0);

  const nextMilestone = vestingSchedule.find((m) => m.date > now);
  const lastMilestone = vestingSchedule[vestingSchedule.length - 1];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 sm:px-5 py-4 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-[13px] font-semibold text-[#0f172a] tracking-tight">Vesting timeline</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">
            {done} of {total} tranches vested · {formatDateObj(grantDate)}
            {lastMilestone ? ` – ${formatDateObj(lastMilestone.date)}` : ''}
          </p>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
          {/* Progress chip */}
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-3 py-1">
            <div className="w-14 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-[#0C447C] rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-[#0C447C]">{pct}%</span>
          </div>
          {/* Legend */}
          <div className="flex gap-3">
            {(['done', 'next', 'future'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                <span className={cn('w-2.5 h-2.5 rounded-full border-2', STATUS_CONFIG[s].dot)} />
                {STATUS_CONFIG[s].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 sm:px-5 pt-5 pb-6 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard
            label="GRANTED"
            value={String(sharesGranted)}
            sub="Face value ₹20"
            valueColor="text-[#0C447C]"
          />
          <SummaryCard
            label="VESTED"
            value={String(vestedShares)}
            sub={
              perShareValue > 0
                ? `₹${new Intl.NumberFormat('en-IN').format(vestedShares * perShareValue)}`
                : `${pct}% of grant`
            }
            valueColor="text-[#27500A]"
          />
          <SummaryCard
            label="NEXT VEST"
            value={nextMilestone ? formatDateObj(nextMilestone.date) : '—'}
            sub={nextMilestone ? `${nextMilestone.shares} shares` : 'Fully vested'}
            valueColor="text-[#0f172a]"
            smallValue={!!nextMilestone}
          />
        </div>

        {/* Rail + milestone dots — desktop */}
        <div className="hidden sm:block relative pt-1">
          {/* Rail */}
          <div className="h-[3px] bg-[#E2E8F0] rounded-full relative">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
              style={{
                width: `${railPct}%`,
                background: 'linear-gradient(90deg, #0C447C, #3563ff)',
              }}
            />
          </div>

          {/* Dots */}
          <div className="flex justify-between relative z-10" style={{ marginTop: '-8px' }}>
            {allMilestones.map((m, i) => {
              const st: Status = m.isGrant ? 'grant' : vestingStatus(m.date, now);
              const cfg = STATUS_CONFIG[st];
              const showCheck = st === 'done' || st === 'grant';

              return (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2"
                  style={{ width: `${100 / allMilestones.length}%` }}
                >
                  <div
                    className={cn(
                      'w-[17px] h-[17px] rounded-full border-2 mx-auto flex items-center justify-center',
                      cfg.dot,
                    )}
                  >
                    {showCheck && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path
                          d="M1 3l2 2 4-4"
                          stroke="#fff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="text-center space-y-0.5 min-w-0">
                    <p className="text-[10px] font-semibold text-[#334155] whitespace-nowrap">
                      {formatDateObj(m.date)}
                    </p>
                    <p className="text-[10px] text-[#64748b]">
                      {m.isGrant ? 'Grant date' : `${m.shares} shares`}
                    </p>
                    <span className={cn('inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vertical timeline — mobile */}
        <div className="sm:hidden space-y-0">
          {allMilestones.map((m, i) => {
            const st: Status = m.isGrant ? 'grant' : vestingStatus(m.date, now);
            const cfg = STATUS_CONFIG[st];
            const showCheck = st === 'done' || st === 'grant';
            const isLast = i === allMilestones.length - 1;

            return (
              <div key={i} className="flex items-start gap-3 pb-4 last:pb-0 relative">
                {!isLast && (
                  <span className="absolute left-[8px] top-[17px] bottom-0 w-[2px] bg-[#E2E8F0]" />
                )}
                <div className={cn('w-[17px] h-[17px] rounded-full border-2 shrink-0 flex items-center justify-center', cfg.dot)}>
                  {showCheck && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 -mt-0.5 pb-1">
                  <p className="text-[12px] font-semibold text-[#334155]">{formatDateObj(m.date)}</p>
                  <p className="text-[11px] text-[#64748b]">{m.isGrant ? 'Grant date' : `${m.shares} shares`}</p>
                  <span className={cn('inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mt-0.5', cfg.badge)}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-t border-[#F1F5F9] flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-md bg-[#EBF3FE] flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#0C447C" strokeWidth="1.2" />
            <path d="M5.5 5v3" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="5.5" cy="3.5" r="0.6" fill="#0C447C" />
          </svg>
        </div>
        <p className="text-[11px] text-[#64748b] leading-relaxed">
          Vesting condition: continued employment + performance rating ≥ 3 on each vesting date.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, sub, valueColor, smallValue,
}: {
  label: string; value: string; sub: string; valueColor: string; smallValue?: boolean;
}) {
  return (
    <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-[9px] px-2 sm:px-3.5 py-2.5 space-y-0.5">
      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-tight sm:tracking-wide text-[#94a3b8] truncate">{label}</p>
      <p className={cn('font-semibold tabular-nums', valueColor, smallValue ? 'text-[12px] sm:text-[13px]' : 'text-[15px] sm:text-[16px]')}>
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] text-[#64748b] truncate">{sub}</p>
    </div>
  );
}

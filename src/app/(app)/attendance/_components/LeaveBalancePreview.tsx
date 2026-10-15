'use client';

import { cn } from '@/lib/utils';
import type { BalanceKey, LeaveBalance, LeaveType } from '@/types/attendance';
import { BALANCE_CASCADE, BALANCE_LABELS, LEAVE_DEDUCTION, LEAVE_TO_BALANCE } from '@/types/attendance';

interface Props {
  balance: LeaveBalance;
  leaveType: LeaveType;
  /** Leave days picked so far. */
  days: number;
}

const SHORT: Record<BalanceKey, string> = {
  casual: 'Casual', privilege: 'Privilege', marriage: 'Marriage', medical: 'Medical', unpaid: 'Unpaid', wfh: 'WFH',
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Same spill the server applies on approval (approveLeave): take from the leave's
 * own pool first, then the next in BALANCE_CASCADE, ending in unpaid.
 */
function split(balance: LeaveBalance, pool: BalanceKey, amount: number): { pool: BalanceKey; take: number }[] {
  const out: { pool: BalanceKey; take: number }[] = [];
  let rest = amount;
  for (const p of BALANCE_CASCADE[pool]) {
    if (rest <= 0) break;
    const { total, used } = balance[p];
    const take = total === 0 ? rest : Math.min(Math.max(0, total - used), rest);
    if (take > 0) out.push({ pool: p, take });
    rest -= take;
  }
  return out;
}

/** Live "what this request does to my balance" card beside the leave form. */
export function LeaveBalancePreview({ balance, leaveType, days }: Props) {
  const pool = LEAVE_TO_BALANCE[leaveType];
  const { total, used } = balance[pool];
  const amount = LEAVE_DEDUCTION[leaveType] * days;
  const capped = total > 0 && pool !== 'wfh';
  const available = capped ? Math.max(0, total - used) : null;
  const parts = capped ? split(balance, pool, amount) : [];
  const fromOwn = parts.find((p) => p.pool === pool)?.take ?? 0;
  const after = available === null ? null : available - fromOwn;
  const spills = parts.filter((p) => p.pool !== pool);

  // Bar: used before · this request · still free — all out of the yearly total.
  const pct = (n: number) => `${Math.min(100, (n / total) * 100)}%`;

  const others = (['casual', 'privilege', 'marriage', 'medical'] as BalanceKey[])
    .filter((k) => k !== pool && balance[k].total > 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-[#FAFBFD] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Your balance</p>
      <p className="mt-0.5 text-[13px] font-medium text-zinc-700">{BALANCE_LABELS[pool]}</p>

      {pool === 'wfh' ? (
        <>
          <p className="mt-3 text-[13px] text-zinc-600">Work from home has no limit.</p>
          <Rows rows={[['Taken this year', fmt(used)], ['This request', days ? `+${fmt(amount)}` : '—']]} />
        </>
      ) : !capped ? (
        <>
          <p className="mt-3 text-[13px] text-zinc-600">Unpaid leave has no limit — pay is deducted for these days.</p>
          <Rows rows={[['This request', days ? `${fmt(amount)} day${amount === 1 ? '' : 's'}` : '—']]} />
        </>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={cn('text-[30px] font-bold leading-none tabular-nums', after !== null && after <= 0 && days ? 'text-[#993C1D]' : 'text-[#0C447C]')}>
              {fmt(days ? Math.max(0, after ?? 0) : available ?? 0)}
            </span>
            <span className="text-[12px] text-zinc-500">{days ? 'left after this' : `of ${fmt(total)} days left`}</span>
          </div>

          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-zinc-200/70" aria-hidden>
            <div className="bg-zinc-400" style={{ width: pct(used) }} />
            <div className="bg-[#0C447C] transition-[width] duration-300" style={{ width: pct(fromOwn) }} />
            <div className="bg-[#9FE1CB] transition-[width] duration-300" style={{ width: pct(Math.max(0, after ?? 0)) }} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-400">
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-zinc-400" />Used</span>
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#0C447C]" />This request</span>
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#9FE1CB]" />Left</span>
          </div>

          <Rows
            rows={[
              ['Available now', fmt(available ?? 0)],
              ['This request', days ? `−${fmt(amount)}` : '—'],
            ]}
            total={['Left after this', days ? fmt(Math.max(0, after ?? 0)) : fmt(available ?? 0)]}
          />

          {spills.length > 0 && (
            <div className="mt-3 rounded-lg bg-[#FAEEDA] px-3 py-2 text-[12px] text-[#854F0B]">
              <p className="font-medium">Goes over by {fmt(amount - fromOwn)} — the extra is taken from:</p>
              <ul className="mt-1 space-y-0.5">
                {spills.map((p) => (
                  <li key={p.pool} className="flex justify-between gap-2">
                    <span>{p.pool === 'unpaid' ? 'Unpaid (pay deducted)' : `${SHORT[p.pool]} leave`}</span>
                    <span className="font-semibold tabular-nums">{fmt(p.take)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {others.length > 0 && (
        <div className="mt-4 border-t border-zinc-200 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{spills.length ? 'Other leave after this' : 'Other leave'}</p>
          <ul className="space-y-1 text-[12px]">
            {others.map((k) => {
              const now = Math.max(0, balance[k].total - balance[k].used);
              // Days this request spills into that pool (e.g. casual running out → privilege).
              const spill = spills.find((p) => p.pool === k)?.take ?? 0;
              return (
                <li key={k} className={cn('flex justify-between gap-2', spill ? 'font-medium text-[#854F0B]' : 'text-zinc-600')}>
                  <span>{SHORT[k]}</span>
                  <span className="tabular-nums text-zinc-500">
                    {spill > 0 && <span className="mr-1 text-zinc-400 line-through">{fmt(now)}</span>}
                    {spill > 0 && <span className="mr-1 text-[#854F0B]">→</span>}
                    <span className={cn('font-medium', spill ? 'text-[#854F0B]' : 'text-zinc-800')}>{fmt(now - spill)}</span> / {fmt(balance[k].total)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Rows({ rows, total }: { rows: [string, string][]; total?: [string, string] }) {
  return (
    <dl className="mt-3 space-y-1.5 text-[12px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2">
          <dt className="text-zinc-500">{k}</dt>
          <dd className="font-medium tabular-nums text-zinc-800">{v}</dd>
        </div>
      ))}
      {total && (
        <div className="flex justify-between gap-2 border-t border-zinc-200 pt-1.5">
          <dt className="font-medium text-zinc-700">{total[0]}</dt>
          <dd className="font-bold tabular-nums text-zinc-900">{total[1]}</dd>
        </div>
      )}
    </dl>
  );
}

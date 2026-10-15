'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
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

/** What each kind of leave is, in terms of how the portal counts it. */
function leaveInfo(pool: BalanceKey, total: number): string {
  const yearly = `${fmt(total)} days each financial year (April–March).`;
  switch (pool) {
    case 'casual':
      return `For short or unplanned time off. ${yearly} When it runs out, extra days come from Privilege leave, then unpaid.`;
    case 'privilege':
      return `For planned time off, like a holiday. ${yearly} It also covers Casual leave once that runs out; beyond it, days are unpaid.`;
    case 'marriage':
      return `For your wedding. ${yearly} Extra days beyond it are unpaid.`;
    case 'medical':
      return `Long-term medical leave, for a longer illness or recovery. ${yearly} You can attach a doctor's note to the request.`;
    case 'unpaid':
      return 'Time off beyond your paid leave. No limit, but pay is deducted for these days.';
    case 'wfh':
      return 'Working from home instead of the office. No limit; the count is just a record.';
  }
}

/**
 * Small ⓘ that explains a leave type — on hover, keyboard focus, or tap. The bubble
 * spans the nearest `relative` row, so it never runs off the panel or the screen.
 */
function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="group inline-flex align-middle" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="grid h-4 w-4 place-items-center rounded-full text-zinc-400 transition hover:text-[#0C447C] focus-visible:text-[#0C447C] focus-visible:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-full z-30 mt-1 rounded-lg bg-zinc-900 px-3 py-2 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-white shadow-lg transition',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          open && 'opacity-100',
        )}
      >
        <span className="mb-0.5 block font-semibold">{label}</span>
        {text}
      </span>
    </span>
  );
}

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
      <p className="relative mt-0.5 flex items-center gap-1 text-[13px] font-medium text-zinc-700">
        {BALANCE_LABELS[pool]}
        <InfoTip label={BALANCE_LABELS[pool]} text={leaveInfo(pool, total)} />
      </p>

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
                  <li key={p.pool} className="relative flex justify-between gap-2">
                    <span className="flex items-center gap-1">
                      {p.pool === 'unpaid' ? 'Unpaid (pay deducted)' : `${SHORT[p.pool]} leave`}
                      <InfoTip label={BALANCE_LABELS[p.pool]} text={leaveInfo(p.pool, balance[p.pool].total)} />
                    </span>
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
                <li key={k} className={cn('relative flex justify-between gap-2', spill ? 'font-medium text-[#854F0B]' : 'text-zinc-600')}>
                  <span className="flex items-center gap-1">
                    {SHORT[k]}
                    <InfoTip label={BALANCE_LABELS[k]} text={leaveInfo(k, balance[k].total)} />
                  </span>
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

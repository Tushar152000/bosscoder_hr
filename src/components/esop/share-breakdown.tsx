import { formatINR, formatDateObj, vestingStatus } from '@/lib/esop/formatters';
import { cn } from '@/lib/utils';
import type { VestingMilestone } from '@/types/esop';

interface Props {
  sharesGranted: number;
  sharesVested: number;
  perShareValue: number;
  vestingSchedule: VestingMilestone[];
}

export function ShareBreakdown({ sharesGranted, sharesVested, perShareValue, vestingSchedule }: Props) {
  const unvested = sharesGranted - sharesVested;
  const vestedPct = sharesGranted > 0 ? Math.round((sharesVested / sharesGranted) * 100) : 0;
  const unvestedPct = 100 - vestedPct;
  const vestedValue = sharesVested * perShareValue;
  const now = new Date();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Share breakdown */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-5">
        <p className="text-[13px] font-semibold text-[#0f172a]">Share breakdown</p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#64748b]">Vested</span>
              <span className="font-medium text-[#27500A]">{vestedPct}%</span>
            </div>
            <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-[#0C447C] rounded-full transition-all" style={{ width: `${vestedPct}%` }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#64748b]">Unvested</span>
              <span className="font-medium text-[#854F0B]">{unvestedPct}%</span>
            </div>
            <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-[#FAC775] rounded-full transition-all" style={{ width: `${unvestedPct}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Total granted', shares: sharesGranted, value: sharesGranted * perShareValue, color: 'bg-[#0C447C]' },
            { label: 'Vested', shares: sharesVested, value: vestedValue, color: 'bg-[#27500A]' },
            { label: 'Unvested', shares: unvested, value: unvested * perShareValue, color: 'bg-[#FAC775]' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full shrink-0', row.color)} />
                <span className="text-[12px] text-[#64748b]">{row.label}</span>
              </div>
              <div className="text-right">
                <span className="text-[12px] font-medium text-[#0f172a]">{row.shares} shares</span>
                <span className="text-[11px] text-[#64748b] ml-2">{formatINR(row.value)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-[#EBF3FE] border border-[#bcd2ff] px-4 py-3 flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#0C447C]">Vested value today</span>
          <span className="text-[15px] font-bold text-[#0C447C]">{formatINR(vestedValue)}</span>
        </div>
      </div>

      {/* Vesting schedule table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <p className="text-[13px] font-semibold text-[#0f172a]">Vesting schedule</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[340px]">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
              <th className="px-5 py-2.5">Date</th>
              <th className="px-5 py-2.5 text-right">Shares</th>
              <th className="px-5 py-2.5 text-right">Value</th>
              <th className="px-5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {vestingSchedule.map((m, i) => {
              const st = vestingStatus(m.date, now);
              const statusMap = {
                done: { label: 'Vested', cls: 'bg-[#E1F5EE] text-[#27500A]' },
                next: { label: 'Next', cls: 'bg-[#EBF3FE] text-[#0C447C]' },
                future: { label: 'Upcoming', cls: 'bg-[#F8FAFC] text-[#64748b] border border-[#E2E8F0]' },
              };
              const { label, cls } = statusMap[st];
              return (
                <tr key={i} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition">
                  <td className="px-5 py-3 text-[12px] text-[#0f172a]">{formatDateObj(m.date)}</td>
                  <td className="px-5 py-3 text-[12px] font-medium text-[#0f172a] text-right tabular-nums">{m.shares}</td>
                  <td className="px-5 py-3 text-[12px] text-[#64748b] text-right tabular-nums">{formatINR(m.shares * perShareValue)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', cls)}>
                      {label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

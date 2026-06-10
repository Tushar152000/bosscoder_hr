import type { AttendanceRecord, BalanceKey, LeaveBalance } from '@/types/attendance';
import { BALANCE_LABELS } from '@/types/attendance';

interface Props {
  balance: LeaveBalance;
  records: AttendanceRecord[];
}

const PAID_KEYS: BalanceKey[] = ['casual', 'privilege', 'marriage', 'medical'];

function BalanceRow({ label, b }: { label: string; b: { total: number; used: number } }) {
  const isUnlimited = b.total === 0;
  const remaining = isUnlimited ? null : b.total - b.used;
  const pct = !isUnlimited && b.total > 0 ? ((b.total - b.used) / b.total) * 100 : 0;
  const low = !isUnlimited && remaining !== null && remaining <= 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-slate-500">{label}</span>
        {isUnlimited ? (
          <span className="text-[11px] font-medium text-slate-400">Unlimited</span>
        ) : (
          <span className={['font-semibold tabular-nums', low ? 'text-red-500' : 'text-slate-700'].join(' ')}>
            {remaining} / {b.total}
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={['h-full rounded-full transition-all', low ? 'bg-red-400' : 'bg-[#0C447C]'].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function LeaveBalanceCard({ balance, records }: Props) {
  const present = records.filter((r) => r.status === 'present').length;
  const absent  = records.filter((r) => r.status === 'absent').length;
  const halfDay = records.filter((r) => r.status === 'half-day').length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
        <h3 className="text-[14px] font-semibold text-slate-800">Leave Balance</h3>

        <div className="space-y-2.5">
          <p className="text-[10px] font-bold tracking-[1px] uppercase text-slate-400">Paid Leaves</p>
          {PAID_KEYS.map((key) => (
            <BalanceRow key={key} label={BALANCE_LABELS[key]} b={balance[key]} />
          ))}
        </div>

        <div className="space-y-2.5">
          <p className="text-[10px] font-bold tracking-[1px] uppercase text-slate-400">Unpaid</p>
          <BalanceRow label={BALANCE_LABELS.unpaid} b={balance.unpaid} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-400">This month</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <p className="text-[22px] font-bold tabular-nums text-emerald-600">{present}</p>
            <p className="text-[10px] text-slate-500">Present</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[22px] font-bold tabular-nums text-red-500">{absent}</p>
            <p className="text-[10px] text-slate-500">Absent</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[22px] font-bold tabular-nums text-amber-500">{halfDay}</p>
            <p className="text-[10px] text-slate-500">Half Day</p>
          </div>
        </div>
      </div>
    </div>
  );
}

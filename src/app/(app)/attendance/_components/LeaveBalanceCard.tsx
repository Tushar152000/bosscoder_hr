import Link from 'next/link';
import type { AttendanceRecord, LeaveBalance, LeaveType } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';

interface Props {
  balance: LeaveBalance;
  records: AttendanceRecord[];
}

const LEAVE_KEYS: LeaveType[] = ['casual', 'privilege', 'marriage', 'medical'];

export function LeaveBalanceCard({ balance, records }: Props) {
  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const halfDay = records.filter((r) => r.status === 'half-day').length;

  return (
    <div className="space-y-4">
      {/* Leave balance */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
        <h3 className="text-[14px] font-semibold text-slate-800">Your leave balance</h3>
        <div className="space-y-3.5">
          {LEAVE_KEYS.map((key) => {
            const b = balance[key];
            const remaining = b.total - b.used;
            const pct = b.total > 0 ? (remaining / b.total) * 100 : 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-500">{LEAVE_LABELS[key]}</span>
                  <span className="font-semibold tabular-nums text-slate-700">
                    {remaining} / {b.total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0C447C] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Link
          href="/attendance/leaves"
          className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          View leaves taken
        </Link>
      </div>

      {/* Monthly stats */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-400">
          This month
        </h3>
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

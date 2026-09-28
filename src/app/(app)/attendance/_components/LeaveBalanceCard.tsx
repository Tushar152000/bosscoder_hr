import type { AttendanceRecord, BalanceKey, LeaveBalance } from '@/types/attendance';

interface Props {
  balance: LeaveBalance;
  records: AttendanceRecord[];
}

interface BalanceConfig {
  key: BalanceKey;
  label: string;
  iconBg: string;
  iconColor: string;
  barFill: string;
  icon: React.ReactNode;
}

const IconSquare = ({
  bg,
  color,
  children,
}: {
  bg: string;
  color: string;
  children: React.ReactNode;
}) => (
  <span
    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
    style={{ backgroundColor: bg, color }}
  >
    {children}
  </span>
);

const BALANCE_CONFIG: BalanceConfig[] = [
  {
    key: 'casual',
    label: 'Casual',
    iconBg: '#E6F1FB',
    iconColor: '#185FA5',
    barFill: '#378ADD',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
      </svg>
    ),
  },
  {
    key: 'privilege',
    label: 'Privilege',
    iconBg: '#E1F5EE',
    iconColor: '#0F6E56',
    barFill: '#1D9E75',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    key: 'medical',
    label: 'Medical',
    iconBg: '#EEEDFE',
    iconColor: '#534AB7',
    barFill: '#7F77DD',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    key: 'marriage',
    label: 'Marriage',
    iconBg: '#FBEAF0',
    iconColor: '#993556',
    barFill: '#D4537E',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    key: 'unpaid',
    label: 'Unpaid',
    iconBg: '#F1EFE8',
    iconColor: '#5F5E5A',
    barFill: '#888780',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
  {
    key: 'wfh',
    label: 'Work From Home',
    iconBg: '#EDEBFB',
    iconColor: '#5B45C9',
    barFill: '#7C5CE0',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
];

function BalanceRow({ cfg, b }: { cfg: BalanceConfig; b: { total: number; used: number } }) {
  // Uncapped pools (total 0) have no quota — show a plain count, no progress bar.
  if (b.total === 0) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconSquare bg={cfg.iconBg} color={cfg.iconColor}>
            {cfg.icon}
          </IconSquare>
          <span className="text-[12px] text-zinc-600">{cfg.label}</span>
        </div>
        <span className="shrink-0 text-[12px] font-medium text-zinc-400">
          {b.used > 0 ? `${b.used} taken` : 'On approval'}
        </span>
      </div>
    );
  }

  // Never show a negative balance — a pool bottoms out at 0 (any excess is
  // accounted as unpaid via the cascade).
  const remaining = Math.max(0, b.total - b.used);
  const usedPct = Math.min(100, Math.max(0, Math.round((b.used / b.total) * 100)));
  const isLow = remaining <= 1;
  const isWarn = !isLow && usedPct >= 75;
  // Consumption bar: fills as leave is used. Solid pool colour → amber → red as it runs low.
  const fillColor = isLow ? '#E24B4A' : isWarn ? '#E0982F' : cfg.barFill;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconSquare bg={cfg.iconBg} color={cfg.iconColor}>
            {cfg.icon}
          </IconSquare>
          <span className="text-[12px] text-zinc-600">{cfg.label}</span>
        </div>
        <span
          className={[
            'shrink-0 text-[12px] tabular-nums font-medium',
            isLow ? 'text-red-600' : 'text-zinc-400',
          ].join(' ')}
        >
          {Math.min(b.used, b.total)} / {b.total} used
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${usedPct}%`, backgroundColor: fillColor }}
          />
        </div>
        <span className="w-[40px] shrink-0 text-right text-[10px] tabular-nums text-zinc-400">
          {usedPct}%
        </span>
      </div>
    </div>
  );
}

export function LeaveBalanceCard({ balance }: Props) {
  return (
    <div className="w-full space-y-4 rounded-[10px] border border-zinc-200 bg-white p-4">
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Leave Balance
        </p>
        <div className="space-y-4">
          {BALANCE_CONFIG.map((cfg) => (
            <BalanceRow key={cfg.key} cfg={cfg} b={balance[cfg.key]} />
          ))}
        </div>
      </div>
    </div>
  );
}

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
];

function BalanceRow({ cfg, b }: { cfg: BalanceConfig; b: { total: number; used: number } }) {
  const isUnlimited = b.total === 0;
  const remaining = isUnlimited ? null : b.total - b.used;
  const pct = !isUnlimited && b.total > 0 ? ((b.total - b.used) / b.total) * 100 : 100;
  const isLow = !isUnlimited && remaining !== null && remaining <= 1;
  const fillColor = isLow ? '#E24B4A' : cfg.barFill;

  return (
    <div className="flex items-center gap-2.5">
      <IconSquare bg={cfg.iconBg} color={cfg.iconColor}>
        {cfg.icon}
      </IconSquare>
      <span className="w-[52px] shrink-0 text-[12px] text-zinc-500">{cfg.label}</span>
      <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
        />
      </div>
      <span
        className={[
          'w-9 shrink-0 text-right text-[12px] tabular-nums',
          isLow ? 'text-red-700' : 'text-zinc-400',
        ].join(' ')}
      >
        {isUnlimited ? '∞' : `${remaining} / ${b.total}`}
      </span>
    </div>
  );
}

export function LeaveBalanceCard({ balance, records }: Props) {
  const present = records.filter((r) => r.status === 'present').length;
  const halfDay = records.filter((r) => r.status === 'half-day').length;
  const absent  = records.filter((r) => r.status === 'absent').length;

  return (
    <div className="space-y-4 rounded-[10px] border border-zinc-200 bg-white p-4">
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Leave Balance
        </p>
        <div className="space-y-3">
          {BALANCE_CONFIG.map((cfg) => (
            <BalanceRow key={cfg.key} cfg={cfg} b={balance[cfg.key]} />
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-3">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          This month
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div
            className="rounded-lg p-2 text-center"
            style={{ backgroundColor: '#EAF3DE', border: '0.5px solid #C0DD97' }}
          >
            <p className="text-[20px] font-medium" style={{ color: '#27500A' }}>{present}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: '#3B6D11' }}>Present</p>
          </div>
          <div
            className="rounded-lg p-2 text-center"
            style={{ backgroundColor: '#FAEEDA', border: '0.5px solid #FAC775' }}
          >
            <p className="text-[20px] font-medium" style={{ color: '#633806' }}>{halfDay}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: '#854F0B' }}>Half day</p>
          </div>
          <div
            className="rounded-lg p-2 text-center"
            style={{ backgroundColor: '#FCEBEB', border: '0.5px solid #F7C1C1' }}
          >
            <p className="text-[20px] font-medium" style={{ color: '#791F1F' }}>{absent}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: '#A32D2D' }}>Absent</p>
          </div>
        </div>
      </div>
    </div>
  );
}

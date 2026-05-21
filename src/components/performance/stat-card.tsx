import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn';
  className?: string;
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-slate-400',
  good:    'text-[#0F6E56]',
  warn:    'text-[#854F0B]',
};

export function StatCard({ label, value, unit, hint, tone = 'default', className }: Props) {
  return (
    <div className={cn('rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.6px] text-slate-400">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-slate-900">
        {value}
        {unit && <span className="ml-0.5 text-[16px] font-medium text-slate-400">{unit}</span>}
      </p>
      {hint && <p className={cn('mt-1.5 text-[11px]', TONE[tone])}>{hint}</p>}
    </div>
  );
}

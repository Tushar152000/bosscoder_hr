import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  /** Decimal denominator like "/5" — rendered smaller next to the value. */
  unit?: string;
  /** Tiny supporting text below (e.g. "Q4 · Best quarter"). */
  hint?: string;
  /** "good" tints the hint green, "warn" amber, default muted. */
  tone?: 'default' | 'good' | 'warn';
  className?: string;
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-muted',
  good: 'text-emerald-400',
  warn: 'text-amber-300',
};

export function StatCard({ label, value, unit, hint, tone = 'default', className }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-default bg-card p-5',
        className
      )}
    >
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-white">
        {value}
        {unit && (
          <span className="ml-0.5 text-xl font-medium text-muted">{unit}</span>
        )}
      </p>
      {hint && (
        <p className={cn('mt-2 text-xs', TONE[tone])}>{hint}</p>
      )}
    </div>
  );
}

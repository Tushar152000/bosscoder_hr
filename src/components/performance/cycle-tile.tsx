import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ReviewCycle } from '@/types/review';

export type TileState = 'submitted' | 'pending' | 'locked' | 'closed' | 'not-open' | 'draft';

interface Props {
  cycle: ReviewCycle;
  /** Resolved state for THIS user, e.g. their own self-eval status. */
  state: TileState;
  /** Optional one-line subtitle (e.g. "Apr 1 – Apr 30"). */
  subtitle?: string;
  /** Anchor href when clickable (defaults to the cycle detail page). */
  href?: string;
}

const STATE: Record<
  TileState,
  { label: string; chip: string; ring: string; underline: string }
> = {
  submitted: {
    label: 'Submitted',
    chip: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    ring: 'ring-emerald-500/40',
    underline: 'after:bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    chip: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    ring: 'ring-amber-500/30',
    underline: 'after:bg-amber-500',
  },
  locked: {
    label: 'Locked',
    chip: 'bg-white/10 text-muted ring-1 ring-white/10',
    ring: 'ring-white/10',
    underline: 'after:bg-white/20',
  },
  closed: {
    label: 'Closed',
    chip: 'bg-white/10 text-muted ring-1 ring-white/10',
    ring: 'ring-white/10',
    underline: 'after:bg-white/20',
  },
  draft: {
    label: 'Draft',
    chip: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
    ring: 'ring-blue-500/30',
    underline: 'after:bg-blue-500',
  },
  'not-open': {
    label: 'Not yet open',
    chip: 'bg-white/5 text-muted ring-1 ring-white/5',
    ring: 'ring-white/5',
    underline: 'after:bg-white/10',
  },
};

export function CycleTile({ cycle, state, subtitle, href }: Props) {
  const s = STATE[state];
  const target = href ?? `/performance/cycles/${cycle.cycleId}`;
  return (
    <Link
      href={target}
      className={cn(
        'group relative block overflow-hidden rounded-xl border border-default bg-card p-5 ring-1 ring-inset transition-all',
        'hover:-translate-y-0.5 hover:bg-card-elevated hover:border-white/15',
        s.ring,
        // bottom underline accent
        'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px]',
        s.underline
      )}
    >
      <h3 className="text-base font-semibold text-white">{cycle.name}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <span
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          s.chip
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {s.label}
      </span>
    </Link>
  );
}

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Bottom underline color — uses one of the `tile-*` tokens. */
  accent: 'blue' | 'purple' | 'orange' | 'green' | 'pink' | 'amber' | 'rose' | 'cyan';
  iconBg: string; // tailwind bg utility (light tinted)
  iconColor: string; // tailwind text utility for icon
  title: string;
  description: string;
  /** Optional small badge (e.g. "Pending: 2"). */
  badge?: string;
}

const ACCENT_TO_BORDER: Record<Props['accent'], string> = {
  blue: 'after:bg-tile-blue',
  purple: 'after:bg-tile-purple',
  orange: 'after:bg-tile-orange',
  green: 'after:bg-tile-green',
  pink: 'after:bg-tile-pink',
  amber: 'after:bg-tile-amber',
  rose: 'after:bg-tile-rose',
  cyan: 'after:bg-tile-cyan',
};

export function QuickTile({
  href,
  icon: Icon,
  accent,
  iconBg,
  iconColor,
  title,
  description,
  badge,
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-xl border border-default bg-card p-5 shadow-tile transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-white/15 hover:bg-card-elevated hover:shadow-tile-hover',
        // Bottom accent line
        'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:opacity-90',
        ACCENT_TO_BORDER[accent]
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'grid h-11 w-11 place-items-center rounded-lg',
            iconBg
          )}
        >
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <ChevronRight className="h-4 w-4 text-muted opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {badge && (
            <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-300">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </Link>
  );
}

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: React.ReactNode;
  /** Omit for the current page (always the last crumb). */
  href?: string;
}

/**
 * The one breadcrumb style used across the app: "⌂ Home › Section › Current page".
 * "Home" is always first — pass only the crumbs after it.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-1.5 text-[14px] font-medium text-slate-400 md:text-[16px]',
        className,
      )}
    >
      <Home size={14} className="shrink-0" />
      <Link href="/" className="transition hover:text-slate-600">
        Home
      </Link>
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight size={11} className="shrink-0" />
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="transition hover:text-slate-600">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn(isLast && 'truncate text-slate-900')} aria-current={isLast ? 'page' : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

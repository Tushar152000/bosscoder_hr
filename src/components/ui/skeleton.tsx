import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Pulse-animated placeholder (or a moving shimmer with `shimmer`). Pair with
 * `loading.tsx` to render route-level skeletons that match the real layout's
 * geometry — keeps the user oriented while server components stream in.
 */
export function Skeleton({
  className,
  shimmer = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { shimmer?: boolean }) {
  return (
    <div
      className={cn('rounded-md bg-slate-100', shimmer ? 'skeleton-shimmer' : 'animate-pulse', className)}
      {...props}
    />
  );
}

/** Convenience: a row of N rectangles with consistent vertical rhythm. */
export function SkeletonStack({
  count = 3,
  className,
  itemClassName,
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('h-14 w-full', itemClassName)} />
      ))}
    </div>
  );
}

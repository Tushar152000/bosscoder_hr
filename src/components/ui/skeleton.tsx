import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Pulse-animated placeholder. Pair with `loading.tsx` to render route-level
 * skeletons that match the real layout's geometry — keeps the user oriented
 * while server components stream in.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200/70', className)}
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

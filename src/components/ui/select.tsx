import * as React from 'react';
import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-default bg-card px-3 py-2 text-sm text-white transition-colors duration-150 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C447C] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))] focus-visible:border-[#0C447C] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-default',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';

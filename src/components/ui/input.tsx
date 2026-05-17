import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-default bg-card px-3 py-2 text-sm text-white transition-colors duration-150 placeholder:text-muted hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C447C]-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))] focus-visible:border-[#0C447C]-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-default',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

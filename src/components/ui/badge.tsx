import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-white/10 text-white ring-1 ring-white/10',
        brand: 'bg-[#0C447C]-500/15 text-[#0C447C]-200 ring-1 ring-[#0C447C]-500/30',
        success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
        danger: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
        muted: 'bg-white/5 text-muted ring-1 ring-white/10',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

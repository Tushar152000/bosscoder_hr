import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C447C]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:        'bg-[#0C447C] text-white shadow-sm hover:bg-[#0a3a6a]',
        default:        'bg-[#0C447C] text-white shadow-sm hover:bg-[#0a3a6a]',
        secondary:      'bg-white border border-[#E2E8F0] text-slate-900 hover:bg-[#F8FAFC] hover:border-[#CBD5E1]',
        outline:        'bg-white border border-[#E2E8F0] text-slate-900 hover:bg-[#F8FAFC] hover:border-[#CBD5E1]',
        ghost:          'bg-transparent text-slate-700 hover:bg-[#F8FAFC]',
        danger:         'bg-white border border-[#FAC8C6] text-[#993C1D] hover:bg-[#FAECE7] hover:border-[#E9A5A2]',
        'danger-solid': 'bg-[#993C1D] text-white hover:bg-[#7E3015]',
      },
      size: {
        default: 'h-10 px-3.5 py-2 text-[14px]',
        md:      'h-10 px-3.5 py-2 text-[14px]',
        sm:      'h-8  px-2.5 py-1 text-[12px]',
        lg:      'h-11 px-4   py-2.5 text-[15px]',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), isLoading && 'cursor-wait', className)}
        ref={ref}
        disabled={disabled || !!isLoading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };

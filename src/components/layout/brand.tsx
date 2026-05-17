import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
  /** 'white' = white SVG for dark backgrounds (default). 'color' = colored SVG for light backgrounds. */
  variant?: 'white' | 'color';
}

export function Brand({ size = 28, className, variant = 'white' }: Props) {
  return (
    <Image
      src={variant === 'color' ? '/bosscoder-icon.svg' : '/bosscoder-icon-white.svg'}
      alt="Bosscoder Workspace"
      width={size}
      height={size}
      priority
      className={cn('shrink-0', className)}
    />
  );
}

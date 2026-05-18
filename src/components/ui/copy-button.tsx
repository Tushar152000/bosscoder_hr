'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Copy to clipboard"
      className={cn(
        'inline-flex items-center justify-center h-6 w-6 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors',
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

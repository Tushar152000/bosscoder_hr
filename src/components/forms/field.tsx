import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  helpText?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, required, optional, helpText, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <label className="text-[14px] font-medium text-slate-900 mb-1.5 flex items-center gap-0.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-slate-400 font-normal ml-0.5 text-[11px]">optional</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-red-600 mt-1">{error}</p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-500 mt-1">{helpText}</p>
      ) : null}
    </div>
  );
}

export const INPUT_CLASS =
  'h-9 w-full px-2.5 bg-white border border-slate-200/70 rounded-md text-[14px] text-slate-900 placeholder:text-slate-400 placeholder:text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 focus:border-[#0C447C] transition disabled:bg-slate-50 disabled:text-slate-400';

'use client';

import PhoneInput from 'react-phone-number-input/max';
import 'react-phone-number-input/style.css';
import { DEFAULT_PHONE_COUNTRY } from '@/lib/phone';

interface Props {
  /** E.164 ("+919876543210") or '' when empty. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
}

/** Country-aware phone input (flag picker + as-you-type formatting), styled like INPUT_CLASS. */
export function PhoneField({ value, onChange, id, required }: Props) {
  return (
    <PhoneInput
      id={id}
      defaultCountry={DEFAULT_PHONE_COUNTRY}
      value={value || undefined}
      onChange={(v) => onChange(v ?? '')}
      placeholder="98765 43210"
      required={required}
      className="flex h-9 w-full items-center gap-2 rounded-md border border-slate-200/70 bg-white px-2.5 transition focus-within:border-[#0C447C] focus-within:ring-2 focus-within:ring-[#0C447C]/20"
      numberInputProps={{
        className:
          'h-full min-w-0 flex-1 bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-[12px] placeholder:text-slate-400',
      }}
    />
  );
}

import { Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Field, INPUT_CLASS } from '@/components/forms/field';
import { SectionHeader } from '@/components/forms/section-header';
import { EncryptionNotice } from './shared';
import type { EmployeeInput } from '@/types/employee';

interface Props {
  form: EmployeeInput;
  onComp: (key: keyof EmployeeInput['compensation'], v: string | null) => void;
}

export function CompensationSection({ form, onComp }: Props) {
  return (
    <div className="bg-white border border-slate-200/70 rounded-xl p-5">
      <SectionHeader
        icon={Banknote}
        iconBg="#FAEEDA"
        iconColor="#854F0B"
        title="Compensation"
        description="Stored encrypted — visible only to HR & founders"
      />
      <EncryptionNotice />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Field label="Annual CTC" optional>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none">₹</span>
            <input
              type="text"
              className={cn(INPUT_CLASS, 'pl-6')}
              value={form.compensation.ctc ?? ''}
              onChange={(e) => onComp('ctc', e.target.value)}
              placeholder="2400000"
            />
          </div>
        </Field>
        <Field label="Fixed salary" optional>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none">₹</span>
            <input
              type="text"
              className={cn(INPUT_CLASS, 'pl-6')}
              value={form.compensation.salary ?? ''}
              onChange={(e) => onComp('salary', e.target.value)}
            />
          </div>
        </Field>
        <Field label="Variable / Bonus" optional>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none">₹</span>
            <input
              type="text"
              className={cn(INPUT_CLASS, 'pl-6')}
              value={form.compensation.bonus ?? ''}
              onChange={(e) => onComp('bonus', e.target.value)}
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

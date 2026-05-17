import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { Field, INPUT_CLASS } from '@/components/forms/field';
import { SectionHeader } from '@/components/forms/section-header';
import type { EmployeeInput, EmployeeStatus } from '@/types/employee';
import type { SetTopField } from './types';

interface Props {
  form: EmployeeInput;
  set: SetTopField;
}

export function EmploymentSection({ form, set }: Props) {
  return (
    <div className="bg-white border border-slate-200/70 rounded-xl p-5">
      <SectionHeader
        icon={Briefcase}
        iconBg="#E1F5EE"
        iconColor="#0F6E56"
        title="Employment"
        description="Contract type, status and key dates"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Field label="Employment type" required>
          <div className="flex gap-1.5">
            {(['full-time', 'contractor', 'intern'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('employmentType', t)}
                className={cn(
                  'flex-1 h-9 rounded-md border text-[12px] font-medium transition',
                  form.employmentType === t
                    ? 'bg-[#E6F1FB] border-[#0C447C] text-[#0C447C]'
                    : 'bg-white border-slate-200/70 text-slate-600 hover:border-slate-300',
                )}
              >
                {t === 'full-time' ? 'Full-time' : t === 'contractor' ? 'Contract' : 'Intern'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Status" required>
          <select
            className={INPUT_CLASS}
            value={form.status}
            onChange={(e) => set('status', e.target.value as EmployeeStatus)}
          >
            <option value="active">Active</option>
            <option value="on-notice">On notice</option>
            <option value="left">Left</option>
          </select>
        </Field>
        <Field label="Joining date" required>
          <input
            type="date"
            className={INPUT_CLASS}
            value={form.joiningDate}
            onChange={(e) => set('joiningDate', e.target.value)}
          />
        </Field>
        <Field label="Exit date" optional helpText="Only if status is on-notice or left">
          <input
            type="date"
            className={INPUT_CLASS}
            value={form.exitDate ?? ''}
            onChange={(e) => set('exitDate', e.target.value || null)}
            disabled={form.status === 'active'}
          />
        </Field>
        <Field
          label="Manages departments"
          optional
          className="md:col-span-2"
          helpText="Department heads see all performance reviews in their department(s)."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-[#FAFAF7] border border-slate-200/70 rounded-md p-3 mt-0.5">
            {DEPARTMENTS.map((d) => {
              const checked = form.managedDepartments.includes(d);
              return (
                <label key={d} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.managedDepartments, d]
                        : form.managedDepartments.filter((x) => x !== d);
                      set('managedDepartments', next);
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-[#0C447C]"
                  />
                  {d}
                </label>
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
}

import { User } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { Field, INPUT_CLASS } from '@/components/forms/field';
import { SectionHeader } from '@/components/forms/section-header';
import type { EmployeeInput } from '@/types/employee';
import type { ManagerOption, SetTopField } from './types';

interface Props {
  form: EmployeeInput;
  set: SetTopField;
  managers: ManagerOption[];
}

export function BasicSection({ form, set, managers }: Props) {
  return (
    <div className="bg-white border border-slate-200/70 rounded-xl p-5">
      <SectionHeader
        icon={User}
        iconBg="#E6F1FB"
        iconColor="#0C447C"
        title="Basic info"
        description="Name, contact details and reporting line"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Field label="Full name" required>
          <input
            type="text"
            className={INPUT_CLASS}
            value={form.displayName}
            onChange={(e) => set('displayName', e.target.value)}
            placeholder="Ananya Rao"
          />
        </Field>
        <Field label="Work email" required helpText="Must be @bosscoderacademy.com to sign in">
          <input
            type="email"
            className={INPUT_CLASS}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="ananya@bosscoderacademy.com"
          />
        </Field>
        <Field label="Designation" required>
          <input
            type="text"
            className={INPUT_CLASS}
            value={form.designation}
            onChange={(e) => set('designation', e.target.value)}
            placeholder="Senior Product Manager"
          />
        </Field>
        <Field label="Department" required>
          <select
            className={INPUT_CLASS}
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
          >
            <option value="" disabled>Select a department…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Reporting manager">
          <select
            className={INPUT_CLASS}
            value={form.managerId ?? ''}
            onChange={(e) => set('managerId', e.target.value || null)}
          >
            <option value="">— No manager —</option>
            {managers.map((m) => (
              <option key={m.employeeId} value={m.employeeId}>
                {m.displayName} · {m.designation}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mobile" required>
          <input
            type="tel"
            className={INPUT_CLASS}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+91 98765 43210"
          />
        </Field>
        <Field label="Personal email" optional className="md:col-span-2">
          <input
            type="email"
            className={INPUT_CLASS}
            value={form.personalEmail ?? ''}
            onChange={(e) => set('personalEmail', e.target.value || null)}
            placeholder="ananya.personal@gmail.com"
          />
        </Field>
      </div>
    </div>
  );
}

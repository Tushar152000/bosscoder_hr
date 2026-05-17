import { ClipboardCheck } from 'lucide-react';
import { SectionHeader } from '@/components/forms/section-header';
import type { EmployeeInput } from '@/types/employee';
import type { ManagerOption } from './types';

interface Props {
  form: EmployeeInput;
  managers: ManagerOption[];
  onEditSection: (id: string) => void;
  onSubmit: () => void;
  pending: boolean;
}

export function ReviewSection({ form, managers, onEditSection, onSubmit, pending }: Props) {
  const managerName = managers.find((m) => m.employeeId === form.managerId)?.displayName ?? '—';

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <SectionHeader
          icon={ClipboardCheck}
          iconBg="#F1F5F9"
          iconColor="#475569"
          title="Review"
          description="Check everything before creating the employee"
        />
        <SummaryCard
          title="Basic info"
          onEdit={() => onEditSection('basic')}
          rows={[
            ['Full name', form.displayName || '—'],
            ['Work email', form.email || '—'],
            ['Designation', form.designation || '—'],
            ['Department', form.department || '—'],
            ['Manager', managerName],
            ['Mobile', form.phone || '—'],
            ...(form.personalEmail ? [['Personal email', form.personalEmail] as [string, string]] : []),
          ]}
        />
        <SummaryCard
          title="Employment"
          onEdit={() => onEditSection('employment')}
          rows={[
            ['Type', form.employmentType],
            ['Status', form.status],
            ['Joining date', form.joiningDate || '—'],
            ...(form.exitDate ? [['Exit date', form.exitDate] as [string, string]] : []),
          ]}
        />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="w-full bg-[#0C447C] text-white rounded-xl py-3 text-[13px] font-medium hover:bg-[#0a3a6a] transition disabled:opacity-60"
      >
        {pending ? 'Creating employee…' : 'Create employee'}
      </button>
    </div>
  );
}

function SummaryCard({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: [string, string][];
}) {
  return (
    <div className="bg-[#FAFAF7] border border-slate-200/70 rounded-lg overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/70">
        <p className="text-[12px] font-medium text-slate-900">{title}</p>
        <button type="button" onClick={onEdit} className="text-[11px] text-[#0C447C] hover:underline">
          Edit
        </button>
      </div>
      <div className="divide-y divide-slate-200/70">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-2 gap-4">
            <span className="text-[11px] text-slate-500 shrink-0">{label}</span>
            <span className="text-[12px] text-slate-900 text-right truncate">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

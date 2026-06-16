'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Briefcase,
  Banknote,
  CreditCard,
  ClipboardCheck,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Home,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { createEmployeeAction } from '@/app/(app)/directory/actions';
import { Field, INPUT_CLASS } from '@/components/forms/field';
import { SectionStepper, type SectionItem } from '@/components/forms/section-stepper';
import { SectionHeader } from '@/components/forms/section-header';
import { FormFooter } from './sections/form-footer';
import type { EmployeeInput, EmployeeStatus } from '@/types/employee';

export type ManagerOption = {
  employeeId: string;
  displayName: string;
  designation: string;
};

interface Props {
  initial: EmployeeInput;
  managers: ManagerOption[];
  canEditSensitive: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SECTIONS: SectionItem[] = [
  { id: 'basic', label: 'Basic info' },
  { id: 'employment', label: 'Employment' },
  { id: 'compensation', label: 'Compensation', locked: true },
  { id: 'bank', label: 'Bank & identity', locked: true },
  { id: 'review', label: 'Review' },
];

function validateSection(id: string, form: EmployeeInput): string | null {
  if (id === 'basic') {
    if (!form.displayName.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Work email is required';
    if (form.email && !form.email.endsWith('@bosscoderacademy.com'))
      return 'Work email must be @bosscoderacademy.com';
    if (!form.designation.trim()) return 'Designation is required';
    if (!form.department) return 'Department is required';
    if (!form.phone.trim() || form.phone.length < 7) return 'Mobile number is required';
  }
  if (id === 'employment') {
    if (!form.joiningDate) return 'Joining date is required';
  }
  return null;
}

export function NewEmployeeForm({ initial, managers, canEditSensitive }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setFormState] = useState<EmployeeInput>(initial);
  const [activeSection, setActiveSection] = useState('basic');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Debounced auto-save indicator
  useEffect(() => {
    const t = setTimeout(() => {
      if (form.displayName || form.email) setLastSaved(new Date());
    }, 300);
    return () => clearTimeout(t);
  }, [form]);

  function set<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setFormState((f) => ({ ...f, [key]: value }));
  }

  function setNestedField(
    group: 'compensation' | 'bank' | 'identity' | 'address' | 'emergencyContact',
    key: string,
    value: string | null,
  ) {
    setFormState((f) => ({
      ...f,
      [group]: { ...(f[group] as Record<string, string | null>), [key]: value || null },
    }));
  }

  function handleSectionClick(id: string) {
    const idx = SECTIONS.findIndex((s) => s.id === id);
    const currentIdx = SECTIONS.findIndex((s) => s.id === activeSection);
    if (idx <= currentIdx || completedIds.has(id)) {
      setActiveSection(id);
      setSectionError(null);
    } else {
      setSectionError('Complete the current section first');
    }
  }

  function handleNext() {
    const err = validateSection(activeSection, form);
    if (err) { setSectionError(err); return; }
    setSectionError(null);
    const idx = SECTIONS.findIndex((s) => s.id === activeSection);
    setCompletedIds((prev) => new Set([...prev, activeSection]));
    if (activeSection === 'review') {
      doSubmit();
    } else if (idx < SECTIONS.length - 1) {
      setActiveSection(SECTIONS[idx + 1].id);
    }
  }

  function doSubmit() {
    setGlobalError(null);
    startTransition(async () => {
      const result = await createEmployeeAction(form);
      if (!result.ok) { setGlobalError(result.error); return; }
      router.push(`/directory/${result.employeeId}`);
      router.refresh();
    });
  }

  const nextSection = SECTIONS[SECTIONS.findIndex((s) => s.id === activeSection) + 1];
  const isReview = activeSection === 'review';

  // ── Nested callbacks ──────────────────────────────────────────────────────────

  const onComp = (key: keyof EmployeeInput['compensation'], v: string | null) =>
    setNestedField('compensation', key, v);
  const onBank = (key: keyof EmployeeInput['bank'], v: string | null) =>
    setNestedField('bank', key, v);
  const onIdentity = (key: keyof EmployeeInput['identity'], v: string | null) =>
    setNestedField('identity', key, v);
  const onAddress = (key: keyof EmployeeInput['address'], v: string | null) =>
    setNestedField('address', key, v);
  const onEmergency = (key: keyof EmployeeInput['emergencyContact'], v: string | null) =>
    setNestedField('emergencyContact', key, v);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="py-5 pb-20 md:px-10 px-6 flex flex-col min-h-[calc(100vh-3.5rem)]">
  
      <div className="pb-5">
        <div className="flex items-center gap-1.5 text-[14px] text-slate-400 mb-3">
          <Home size={16} />
          <Link href="/" className="hover:text-slate-600 transition md:text-[16px] text-[14px]">Home</Link>
          <ChevronRight size={11} />
          <Link href="/directory" className="hover:text-slate-600 transition">Directory</Link>
          <ChevronRight size={11} />
          <span className="text-slate-900 md:text-[16px] text-[14px]">New employee</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] font-medium text-slate-900">Add a new employee</h1>
            <p className="text-[14px] text-slate-500 mt-0.5">
              Fill in the details below. They&apos;ll receive an invite to set up their account.
            </p>
          </div>
          <Link
            href="/directory"
            className="flex items-center gap-1.5 bg-white border border-slate-200/70 rounded-md px-3 py-1.5 text-[14px] font-medium text-slate-900 hover:bg-slate-50 transition shrink-0"
          >
            <ArrowLeft size={13} />
            Back to directory
          </Link>
        </div>


        <div className="mt-4 bg-[#E6F1FB] border border-[#B5D4F4] rounded-lg p-3.5 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-[#0C447C] shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-medium text-[#0C447C]">
              Sensitive fields are encrypted at rest
            </p>
            <p className="text-[12px] text-[#185FA5] leading-relaxed mt-0.5">
              Compensation, bank, identity and address are encrypted before storage. Only HR and
              founders with the right permissions can read them back.
            </p>
          </div>
        </div>
      </div>


      <div className="flex gap-2 overflow-x-auto pb-3 md:hidden">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSectionClick(s.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap px-4 rounded-full text-[14px] font-medium border shrink-0 transition',
              s.id === activeSection
                ? 'bg-[#0C447C] text-white border-[#0C447C]'
                : completedIds.has(s.id)
                  ? 'bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/20'
                  : 'bg-white text-slate-500 border-slate-200/70',
            )}
          >
            {completedIds.has(s.id) ? (
              <Check size={10} strokeWidth={2.5} />
            ) : (
              <span>{i + 1}</span>
            )}
            <span>{s.label}</span>
          </button>
        ))}
      </div>


      {globalError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800 mb-4">
          {globalError}
        </div>
      )}

      <div className="grid md:grid-cols-[200px_1fr] gap-6 pb-6 flex-1">
        <div className="hidden md:block">
          <SectionStepper
            sections={SECTIONS}
            activeId={activeSection}
            completedIds={completedIds}
            onSelect={handleSectionClick}
          />
        </div>

        <div>
          {sectionError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 mb-3">
              {sectionError}
            </div>
          )}

          {activeSection === 'basic' && (
            <BasicSection form={form} set={set} managers={managers} />
          )}
          {activeSection === 'employment' && (
            <EmploymentSection form={form} set={set} />
          )}
          {activeSection === 'compensation' && (
            canEditSensitive ? (
              <CompensationSection form={form} onComp={onComp} />
            ) : (
              <NoPermissionCard noun="compensation" />
            )
          )}
          {activeSection === 'bank' && (
            canEditSensitive ? (
              <BankSection
                form={form}
                set={set}
                onBank={onBank}
                onIdentity={onIdentity}
                onAddress={onAddress}
                onEmergency={onEmergency}
              />
            ) : (
              <NoPermissionCard noun="bank & identity" />
            )
          )}
          {activeSection === 'review' && (
            <ReviewSection
              form={form}
              managers={managers}
              onEditSection={handleSectionClick}
              onSubmit={doSubmit}
              pending={pending}
            />
          )}
        </div>
      </div>

      <FormFooter
        lastSaved={lastSaved}
        isReview={isReview}
        nextSectionLabel={nextSection?.label}
        pending={pending}
        onNext={handleNext}
        onValidate={() => setSectionError(validateSection(activeSection, form))}
      />
    </div>
  );
}


function BasicSection({
  form,
  set,
  managers,
}: {
  form: EmployeeInput;
  set: <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) => void;
  managers: ManagerOption[];
}) {
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

function EmploymentSection({
  form,
  set,
}: {
  form: EmployeeInput;
  set: <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) => void;
}) {
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
        <Field
          label="Exit date"
          optional
          helpText="Only if status is on-notice or left"
        >
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

function CompensationSection({
  form,
  onComp,
}: {
  form: EmployeeInput;
  onComp: (key: keyof EmployeeInput['compensation'], v: string | null) => void;
}) {
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


function BankSection({
  form,
  set,
  onBank,
  onIdentity,
  onAddress,
  onEmergency,
}: {
  form: EmployeeInput;
  set: <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) => void;
  onBank: (k: keyof EmployeeInput['bank'], v: string | null) => void;
  onIdentity: (k: keyof EmployeeInput['identity'], v: string | null) => void;
  onAddress: (k: keyof EmployeeInput['address'], v: string | null) => void;
  onEmergency: (k: keyof EmployeeInput['emergencyContact'], v: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <SectionHeader
          icon={CreditCard}
          iconBg="#EEEDFE"
          iconColor="#534AB7"
          title="Bank & identity"
          description="Account details and government IDs — encrypted at rest"
        />
        <EncryptionNotice />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Account number" optional>
            <input type="text" className={INPUT_CLASS} value={form.bank.accountNumber ?? ''} onChange={(e) => onBank('accountNumber', e.target.value)} placeholder="•••••••••••••••" />
          </Field>
          <Field label="IFSC" optional>
            <input type="text" className={INPUT_CLASS} value={form.bank.ifsc ?? ''} onChange={(e) => onBank('ifsc', e.target.value)} placeholder="SBIN0001234" />
          </Field>
          <Field label="Beneficiary name" optional>
            <input type="text" className={INPUT_CLASS} value={form.bank.beneficiaryName ?? ''} onChange={(e) => onBank('beneficiaryName', e.target.value)} />
          </Field>
          <Field label="PAN" optional>
            <input type="text" className={INPUT_CLASS} value={form.identity.pan ?? ''} onChange={(e) => onIdentity('pan', e.target.value)} placeholder="ABCDE1234F" maxLength={10} />
          </Field>
          <Field label="Aadhaar (last 4 digits)" optional>
            <input type="text" className={INPUT_CLASS} value={form.identity.aadhaar ?? ''} onChange={(e) => onIdentity('aadhaar', e.target.value)} placeholder="XXXX" maxLength={4} />
          </Field>
          <Field label="Date of birth" optional>
            <input type="date" className={INPUT_CLASS} value={form.dob ?? ''} onChange={(e) => set('dob', e.target.value || null)} />
          </Field>
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <p className="text-[13px] font-medium text-slate-900 mb-4">Address</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Line 1" optional className="md:col-span-2">
            <input type="text" className={INPUT_CLASS} value={form.address.line1 ?? ''} onChange={(e) => onAddress('line1', e.target.value)} />
          </Field>
          <Field label="Line 2" optional className="md:col-span-2">
            <input type="text" className={INPUT_CLASS} value={form.address.line2 ?? ''} onChange={(e) => onAddress('line2', e.target.value)} />
          </Field>
          <Field label="City" optional>
            <input type="text" className={INPUT_CLASS} value={form.address.city ?? ''} onChange={(e) => onAddress('city', e.target.value)} />
          </Field>
          <Field label="State" optional>
            <input type="text" className={INPUT_CLASS} value={form.address.state ?? ''} onChange={(e) => onAddress('state', e.target.value)} />
          </Field>
          <Field label="Pincode" optional>
            <input type="text" className={INPUT_CLASS} value={form.address.pincode ?? ''} onChange={(e) => onAddress('pincode', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <p className="text-[13px] font-medium text-slate-900 mb-4">Emergency contact</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Contact name" optional>
            <input type="text" className={INPUT_CLASS} value={form.emergencyContact.name ?? ''} onChange={(e) => onEmergency('name', e.target.value)} />
          </Field>
          <Field label="Contact phone" optional>
            <input type="text" className={INPUT_CLASS} value={form.emergencyContact.phone ?? ''} onChange={(e) => onEmergency('phone', e.target.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function ReviewSection({
  form,
  managers,
  onEditSection,
  onSubmit,
  pending,
}: {
  form: EmployeeInput;
  managers: ManagerOption[];
  onEditSection: (id: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
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

function EncryptionNotice() {
  return (
    <div className="flex items-start gap-2 bg-[#FAEEDA] border border-[#FAC775] rounded-md p-2.5 mb-4">
      <Lock size={13} className="text-[#854F0B] mt-0.5 shrink-0" />
      <p className="text-[11px] text-[#854F0B]">
        These values are encrypted before being sent to storage.
      </p>
    </div>
  );
}

function NoPermissionCard({ noun }: { noun: string }) {
  return (
    <div className="bg-white border border-slate-200/70 rounded-xl p-8 text-center">
      <Lock size={20} className="text-slate-300 mx-auto mb-2" />
      <p className="text-[12px] text-slate-500">
        You don&apos;t have permission to view or edit {noun} fields.
      </p>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Briefcase,
  ShieldCheck,
  MapPin,
  Phone,
  Lock,
  AlertCircle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Field, INPUT_CLASS } from '@/components/forms/field';
import { PhoneField } from '@/components/forms/phone-field';
import { SectionHeader } from '@/components/forms/section-header';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { createEmployeeAction, updateEmployeeAction } from '@/app/(app)/directory/actions';
import {
  EMPLOYEE_STATUSES,
  type AddressFields,
  type EmployeeInput,
  type EmployeePublic,
} from '@/types/employee';
import { IdentityDocuments, type IdDocument } from '@/components/employees/identity-documents';

/** Common answers for the emergency contact's relation (free text is fine too). */
const RELATIONS = ['Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Guardian', 'Friend'];

const sameAddress = (a: AddressFields, b: AddressFields) =>
  a.line1 === b.line1 && a.line2 === b.line2 && a.city === b.city && a.state === b.state && a.pincode === b.pincode;
const isBlank = (a: AddressFields) => !a.line1 && !a.line2 && !a.city && !a.state && !a.pincode;

interface Props {
  mode: 'create' | 'edit';
  initial: EmployeeInput;
  employeeId?: string;
  managers: { employeeId: string; displayName: string; designation: string }[];
  canEditSensitive: boolean;
  /** Edit mode: Aadhaar / PAN pictures. */
  idDocs?: IdDocument[];
}

const EMPTY_FAMILY = { fatherName: null, fatherPhone: null, motherName: null, motherPhone: null };
const EMPTY_PREVIOUS = { company: null, managerName: null, managerPhone: null, managerEmail: null };

export function EmployeeForm({ mode, initial, employeeId, managers, canEditSensitive, idDocs = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<EmployeeInput>(initial);
  const [error, setError] = useState<string | null>(null);
  // Permanent = current until HR says otherwise (or they already differ).
  const [permanentSame, setPermanentSame] = useState(
    () => isBlank(initial.permanentAddress) || sameAddress(initial.address, initial.permanentAddress),
  );

  function set<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setNested<G extends 'identity' | 'address' | 'permanentAddress' | 'emergencyContact'>(
    group: G,
    key: keyof EmployeeInput[G],
    value: string | null
  ) {
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value || null } }));
  }

  function setFamily(key: keyof NonNullable<EmployeeInput['family']>, value: string) {
    setForm((f) => ({ ...f, family: { ...(f.family ?? EMPTY_FAMILY), [key]: value || null } }));
  }

  function setPrevious(key: keyof NonNullable<EmployeeInput['previousEmployment']>, value: string) {
    setForm((f) => ({ ...f, previousEmployment: { ...(f.previousEmployment ?? EMPTY_PREVIOUS), [key]: value || null } }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = permanentSame ? { ...form, permanentAddress: { ...form.address } } : form;
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createEmployeeAction(payload)
          : await updateEmployeeAction(employeeId!, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const dest = result.roleMessage
        ? `/directory/${result.employeeId}?msg=${encodeURIComponent(result.roleMessage)}`
        : `/directory/${result.employeeId}`;
      router.push(dest);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-20">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <SectionHeader
          icon={User}
          iconBg="#E6F1FB"
          iconColor="#0C447C"
          title="Basic info"
          description="Public fields visible to anyone signed in"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <input
              className={INPUT_CLASS}
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="Ananya Rao"
              required
            />
          </Field>
          <Field label="Work email" required helpText="Must be @bosscoderacademy.com to sign in">
            <input
              type="email"
              className={INPUT_CLASS}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="ananya@bosscoderacademy.com"
              required
            />
          </Field>
          <Field label="Designation" required>
            <input
              className={INPUT_CLASS}
              value={form.designation}
              onChange={(e) => set('designation', e.target.value)}
              placeholder="Senior Product Manager"
              required
            />
          </Field>
          <Field label="Department" required>
            <select
              className={INPUT_CLASS}
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
              required
            >
              <option value="" disabled>Select a department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Mobile" required helpText="Used for cycle-opening notifications">
            <PhoneField value={form.phone} onChange={(v) => set('phone', v)} required />
          </Field>
          <Field label="Personal email" optional>
            <input
              type="email"
              className={INPUT_CLASS}
              value={form.personalEmail ?? ''}
              onChange={(e) => set('personalEmail', e.target.value || null)}
              placeholder="personal@gmail.com"
            />
          </Field>
        </div>
      </div>

      {/* Employment */}
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <SectionHeader
          icon={Briefcase}
          iconBg="#E1F5EE"
          iconColor="#0F6E56"
          title="Employment"
          description="Contract type, status and key dates"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              onChange={(e) => set('status', e.target.value as EmployeeInput['status'])}
            >
              {EMPLOYEE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Joining date" required>
            <input
              type="date"
              className={INPUT_CLASS}
              value={form.joiningDate}
              onChange={(e) => set('joiningDate', e.target.value)}
              required
            />
          </Field>
          <Field label="Birthday" optional helpText="Only month and day are saved — year is never stored">
            <input
              type="date"
              className={INPUT_CLASS}
              value={form.dateOfBirth ? `2000-${form.dateOfBirth}` : ''}
              onChange={(e) => {
                const raw = e.target.value; // "2000-MM-DD"
                set('dateOfBirth', raw ? raw.slice(5) : null); // store only MM-DD
              }}
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
          <Field label="Reporting manager" optional helpText="Sets up the org tree" className="sm:col-span-2">
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
          <Field
            label="Manages departments"
            optional
            helpText="Department heads see all performance reviews in their department(s)."
            className="sm:col-span-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#FAFAF7] border border-slate-200/70 rounded-md p-3 mt-0.5">
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

      {/* Sensitive sections */}
      {canEditSensitive ? (
        <>
          {/* Identity */}
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200/70 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#FAEEDA' }}>
                  <ShieldCheck size={15} color="#854F0B" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-slate-900">Identity &amp; personal</p>
                  <p className="text-[11px] text-slate-500">Government IDs and date of birth — encrypted at rest</p>
                </div>
              </div>
              <EncryptedBadge />
            </div>
            <EncryptionNotice />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="PAN" optional>
                <input className={INPUT_CLASS} value={form.identity.pan ?? ''} onChange={(e) => setNested('identity', 'pan', e.target.value)} placeholder="ABCDE1234F" maxLength={10} />
              </Field>
              <Field label="Aadhaar" optional>
                <input className={INPUT_CLASS} inputMode="numeric" value={form.identity.aadhaar ?? ''} onChange={(e) => setNested('identity', 'aadhaar', e.target.value)} placeholder="12 digits" maxLength={14} />
              </Field>
              <Field label="UAN" optional>
                <input className={INPUT_CLASS} inputMode="numeric" value={form.uan ?? ''} onChange={(e) => set('uan', e.target.value || null)} placeholder="12-digit PF number" maxLength={14} />
              </Field>
              <Field label="Date of birth" optional>
                <input type="date" className={INPUT_CLASS} value={form.dob ?? ''} onChange={(e) => set('dob', e.target.value || null)} />
              </Field>
            </div>
            {mode === 'edit' && employeeId && (
              <div className="mt-5">
                <p className="mb-2 text-[12px] font-medium text-slate-700">Aadhaar &amp; PAN pictures</p>
                <IdentityDocuments
                  employeeId={employeeId}
                  docs={idDocs}
                  canUpload
                />
              </div>
            )}
          </div>

          {/* Address */}
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200/70 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#FAEEDA' }}>
                  <MapPin size={15} color="#854F0B" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-slate-900">Address</p>
                  <p className="text-[11px] text-slate-500">Current and permanent address — encrypted at rest</p>
                </div>
              </div>
              <EncryptedBadge />
            </div>
            <EncryptionNotice />
            <p className="mb-3 text-[12px] font-medium text-slate-700">Current address</p>
            <AddressFieldsInput value={form.address} onChange={(k, v) => setNested('address', k, v)} />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-slate-700">Permanent address</p>
              <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  checked={permanentSame}
                  onChange={(e) => setPermanentSame(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#0C447C]"
                />
                Same as current address
              </label>
            </div>
            {!permanentSame && (
              <div className="mt-3">
                <AddressFieldsInput value={form.permanentAddress} onChange={(k, v) => setNested('permanentAddress', k, v)} />
              </div>
            )}
          </div>

          {/* Emergency contact */}
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200/70 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#FAEEDA' }}>
                  <Phone size={15} color="#854F0B" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-slate-900">Emergency contact</p>
                  <p className="text-[11px] text-slate-500">Next of kin — encrypted at rest</p>
                </div>
              </div>
              <EncryptedBadge />
            </div>
            <EncryptionNotice />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Contact name" optional>
                <input className={INPUT_CLASS} value={form.emergencyContact.name ?? ''} onChange={(e) => setNested('emergencyContact', 'name', e.target.value)} />
              </Field>
              <Field label="Contact phone" optional>
                <input className={INPUT_CLASS} value={form.emergencyContact.phone ?? ''} onChange={(e) => setNested('emergencyContact', 'phone', e.target.value)} />
              </Field>
              <Field label="Relation" optional>
                <input
                  className={INPUT_CLASS}
                  list="emergency-relations"
                  value={form.emergencyContact.relation ?? ''}
                  onChange={(e) => setNested('emergencyContact', 'relation', e.target.value)}
                  placeholder="e.g. Father, Spouse"
                />
                <datalist id="emergency-relations">
                  {RELATIONS.map((r) => <option key={r} value={r} />)}
                </datalist>
              </Field>
            </div>
          </div>

          {/* Family & previous employment */}
          {mode === 'edit' && (
            <div className="bg-white border border-slate-200/70 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200/70 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#FAEEDA' }}>
                    <Users size={15} color="#854F0B" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-slate-900">Family &amp; previous job</p>
                    <p className="text-[11px] text-slate-500">Usually filled in by the employee on their onboarding form — encrypted at rest</p>
                  </div>
                </div>
                <EncryptedBadge />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Father's name" optional>
                  <input className={INPUT_CLASS} value={form.family?.fatherName ?? ''} onChange={(e) => setFamily('fatherName', e.target.value)} />
                </Field>
                <Field label="Father's mobile" optional>
                  <input className={INPUT_CLASS} value={form.family?.fatherPhone ?? ''} onChange={(e) => setFamily('fatherPhone', e.target.value)} />
                </Field>
                <Field label="Mother's name" optional>
                  <input className={INPUT_CLASS} value={form.family?.motherName ?? ''} onChange={(e) => setFamily('motherName', e.target.value)} />
                </Field>
                <Field label="Mother's mobile" optional>
                  <input className={INPUT_CLASS} value={form.family?.motherPhone ?? ''} onChange={(e) => setFamily('motherPhone', e.target.value)} />
                </Field>
              </div>
              <p className="mt-6 mb-3 text-[12px] font-medium text-slate-700">Previous employment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company" optional className="sm:col-span-2">
                  <input className={INPUT_CLASS} value={form.previousEmployment?.company ?? ''} onChange={(e) => setPrevious('company', e.target.value)} />
                </Field>
                <Field label="Reporting manager" optional>
                  <input className={INPUT_CLASS} value={form.previousEmployment?.managerName ?? ''} onChange={(e) => setPrevious('managerName', e.target.value)} />
                </Field>
                <Field label="Manager's mobile" optional>
                  <input className={INPUT_CLASS} value={form.previousEmployment?.managerPhone ?? ''} onChange={(e) => setPrevious('managerPhone', e.target.value)} />
                </Field>
                <Field label="Manager's email" optional className="sm:col-span-2">
                  <input type="email" className={INPUT_CLASS} value={form.previousEmployment?.managerEmail ?? ''} onChange={(e) => setPrevious('managerEmail', e.target.value)} />
                </Field>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-slate-200/70 rounded-xl p-6">
          <div className="flex items-center gap-3 p-4 bg-[#FAFAF7] border border-slate-200/70 rounded-lg">
            <Lock size={16} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-slate-700">Sensitive fields are hidden</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Identity, address and emergency contact are visible to HR &amp; founders only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer */}
      {/* Same side padding as the page so the buttons line up with the form's right edge. */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200/70 px-6 md:px-10 py-3.5">
        <div className="w-full flex items-center justify-between gap-3">
          <p className="text-[12px] text-slate-400 hidden sm:block">
            {mode === 'edit' ? 'Editing employee record' : 'New employee'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={pending}
              className="h-9 px-4 text-[13px] font-medium text-slate-700 bg-white border border-slate-200/70 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 px-4 text-[13px] font-medium text-white bg-[#0C447C] rounded-lg hover:bg-[#0a3a6a] transition disabled:opacity-60 flex items-center gap-1.5"
            >
              {pending && (
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {pending ? 'Saving…' : mode === 'create' ? 'Create employee' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function EncryptedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
      <Lock size={9} />
      Encrypted
    </span>
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

export type ManagerOption = Pick<EmployeePublic, 'employeeId' | 'displayName' | 'designation'>;
function AddressFieldsInput({
  value,
  onChange,
}: {
  value: AddressFields;
  onChange: (key: keyof AddressFields, v: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Line 1" optional className="sm:col-span-2">
        <input className={INPUT_CLASS} value={value.line1 ?? ''} onChange={(e) => onChange('line1', e.target.value)} />
      </Field>
      <Field label="Line 2" optional className="sm:col-span-2">
        <input className={INPUT_CLASS} value={value.line2 ?? ''} onChange={(e) => onChange('line2', e.target.value)} />
      </Field>
      <Field label="City" optional>
        <input className={INPUT_CLASS} value={value.city ?? ''} onChange={(e) => onChange('city', e.target.value)} />
      </Field>
      <Field label="State" optional>
        <input className={INPUT_CLASS} value={value.state ?? ''} onChange={(e) => onChange('state', e.target.value)} />
      </Field>
      <Field label="Pincode" optional>
        <input className={INPUT_CLASS} value={value.pincode ?? ''} onChange={(e) => onChange('pincode', e.target.value)} />
      </Field>
    </div>
  );
}

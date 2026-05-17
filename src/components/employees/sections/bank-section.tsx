import { CreditCard } from 'lucide-react';
import { Field, INPUT_CLASS } from '@/components/forms/field';
import { SectionHeader } from '@/components/forms/section-header';
import { EncryptionNotice } from './shared';
import type { EmployeeInput } from '@/types/employee';
import type { SetTopField } from './types';

interface Props {
  form: EmployeeInput;
  set: SetTopField;
  onBank: (k: keyof EmployeeInput['bank'], v: string | null) => void;
  onIdentity: (k: keyof EmployeeInput['identity'], v: string | null) => void;
  onAddress: (k: keyof EmployeeInput['address'], v: string | null) => void;
  onEmergency: (k: keyof EmployeeInput['emergencyContact'], v: string | null) => void;
}

export function BankSection({ form, set, onBank, onIdentity, onAddress, onEmergency }: Props) {
  return (
    <div className="space-y-3">
      {/* Bank + identity card */}
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

      {/* Address card */}
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

      {/* Emergency contact card */}
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

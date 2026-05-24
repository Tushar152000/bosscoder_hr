'use client';

import { useTransition, useState } from 'react';
import { X } from 'lucide-react';
import { formatIsoDate } from '@/lib/format';
import { createEsopGrantAction, updateEsopGrantAction } from '@/app/(app)/esop/actions';
import type { EsopGrant, EsopPlan } from '@/types/esop';
import type { EmployeePublic } from '@/types/employee';

interface Props {
  grant?: EsopGrant;
  plans: EsopPlan[];
  employees: EmployeePublic[];
  onClose: () => void;
}

export function EsopGrantForm({ grant, plans, employees, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = grant
        ? await updateEsopGrantAction(grant.grantId, fd)
        : await createEsopGrantAction(fd);
      if (!res.ok) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-[2px]">
      <div className="relative w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] sticky top-0 bg-white">
          <h2 className="text-[15px] font-semibold text-slate-900">
            {grant ? 'Edit Grant' : 'Assign Grant'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!grant && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Employee</label>
                <select name="employeeId" required
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C]/20">
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>{e.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ESOP Plan</label>
                <select name="planId" required
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C]/20">
                  <option value="">Select plan…</option>
                  {plans.map((p) => (
                    <option key={p.planId} value={p.planId}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Shares granted" name="sharesGranted" type="number" defaultValue={grant?.sharesGranted} placeholder="e.g. 500" required />
            <Field label="Shares vested" name="sharesVested" type="number" defaultValue={grant?.sharesVested ?? 0} placeholder="0" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grant date" name="grantDate" type="date" defaultValue={formatIsoDate(grant?.grantDate)} required />
            <Field label="Vesting start date" name="vestingStartDate" type="date" defaultValue={formatIsoDate(grant?.vestingStartDate)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliff (months)" name="cliffMonths" type="number" defaultValue={grant?.cliffMonths ?? 12} required />
            <Field label="Vesting period (months)" name="vestingMonths" type="number" defaultValue={grant?.vestingMonths ?? 48} required />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Notes (optional)</label>
            <textarea name="notes" rows={2} defaultValue={grant?.notes}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C]/20 resize-none" />
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[13px] font-medium text-slate-700 hover:bg-[#F8FAFC] transition">
              Cancel
            </button>
            <button type="submit" disabled={pending}
              className="px-3.5 py-2 rounded-lg bg-[#0C447C] text-white text-[13px] font-medium hover:bg-[#0a3a6a] transition disabled:opacity-50">
              {pending ? 'Saving…' : grant ? 'Save changes' : 'Assign grant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', defaultValue, placeholder, required }: {
  label: string; name: string; type?: string;
  defaultValue?: string | number; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-600 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue as string} placeholder={placeholder} required={required}
        className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C]/20"
      />
    </div>
  );
}

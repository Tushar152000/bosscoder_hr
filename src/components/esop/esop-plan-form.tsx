'use client';

import { useTransition, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIsoDate } from '@/lib/format';
import { createEsopPlanAction, updateEsopPlanAction } from '@/app/(app)/esop/actions';
import type { EsopPlan } from '@/types/esop';

interface Props {
  plan?: EsopPlan;
  onClose: () => void;
}

export function EsopPlanForm({ plan, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = plan
        ? await updateEsopPlanAction(plan.planId, fd)
        : await createEsopPlanAction(fd);
      if (!res.ok) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-[2px]">
      <div className="relative w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-[15px] font-semibold text-slate-900">
            {plan ? 'Edit ESOP Plan' : 'New ESOP Plan'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Plan name" name="name" defaultValue={plan?.name} placeholder="e.g. ESOP Grant 2024" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="AGM date" name="agmDate" type="date" defaultValue={formatIsoDate(plan?.agmDate)} required />
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Type</label>
              <select
                name="type"
                defaultValue={plan?.type ?? 'ESOP'}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C]/20"
              >
                <option value="ESOP">ESOP</option>
                <option value="PSU">PSU</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total shares" name="totalShares" type="number" defaultValue={plan?.totalShares} placeholder="e.g. 10000" required />
            <Field label="Face value (₹)" name="faceValue" type="number" step="0.01" defaultValue={plan?.faceValue} placeholder="e.g. 10" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valuation year" name="valuationYear" type="number" defaultValue={plan?.valuationYear ?? new Date().getFullYear()} required />
            <Field label="Per share value (₹)" name="perShareValue" type="number" step="0.01" defaultValue={plan?.perShareValue} placeholder="e.g. 250" required />
          </div>
          <Field label="Total valuation (₹)" name="valuationTotal" type="number" step="0.01" defaultValue={plan?.valuationTotal} placeholder="e.g. 25000000" required />

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[13px] font-medium text-slate-700 hover:bg-[#F8FAFC] transition">
              Cancel
            </button>
            <button type="submit" disabled={pending}
              className="px-3.5 py-2 rounded-lg bg-[#0C447C] text-white text-[13px] font-medium hover:bg-[#0a3a6a] transition disabled:opacity-50">
              {pending ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', defaultValue, placeholder, required, step }: {
  label: string; name: string; type?: string; defaultValue?: string | number;
  placeholder?: string; required?: boolean; step?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue as string}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C]/20"
      />
    </div>
  );
}

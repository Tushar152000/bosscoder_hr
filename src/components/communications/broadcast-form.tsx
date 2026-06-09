'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { sendBroadcastAction, type BroadcastResult } from '@/app/(app)/communications/actions';

interface Department {
  name: string;
  count: number;
}

interface Props {
  departments: Department[];
  employeesByDept: Record<string, { email: string; displayName: string }[]>;
  senderName: string;
}

export function BroadcastForm({ departments, employeesByDept, senderName }: Props) {
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [deptPanelOpen, setDeptPanelOpen] = useState(true);

  const allSelected = selectedDepts.size === departments.length && departments.length > 0;

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    const list: { email: string; displayName: string }[] = [];
    for (const dept of selectedDepts) {
      for (const emp of employeesByDept[dept] ?? []) {
        if (!seen.has(emp.email)) {
          seen.add(emp.email);
          list.push(emp);
        }
      }
    }
    return list;
  }, [selectedDepts, employeesByDept]);

  function toggleDept(dept: string) {
    setResult(null);
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }

  function toggleAll() {
    setResult(null);
    setSelectedDepts(allSelected ? new Set() : new Set(departments.map((d) => d.name)));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await sendBroadcastAction({ recipients, subject, message });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      setSubject('');
      setMessage('');
      setSelectedDepts(new Set());
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">

        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden self-start">
          <button
            type="button"
            onClick={() => setDeptPanelOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0C447C]" />
              <span className="text-[13px] font-semibold text-slate-900">Departments</span>
              {selectedDepts.size > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#0C447C] text-white text-[10px] font-bold">
                  {selectedDepts.size}
                </span>
              )}
            </div>
            {deptPanelOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {deptPanelOpen && (
            <>
              {/* Select / deselect all */}
              <div className="px-4 py-2 border-b border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[11px] font-medium text-[#0C447C] hover:underline"
                >
                  {allSelected ? 'Deselect all' : 'Select all departments'}
                </button>
              </div>

              {/* Dept list */}
              <div className="divide-y divide-[#F1F5F9] max-h-[400px] overflow-y-auto">
                {departments.map((dept) => {
                  const checked = selectedDepts.has(dept.name);
                  return (
                    <label
                      key={dept.name}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#F5F8FF] transition select-none',
                        checked && 'bg-[#EBF3FE]',
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition',
                          checked
                            ? 'bg-[#0C447C] border-[#0C447C]'
                            : 'border-slate-300 bg-white',
                        )}
                      >
                        {checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path
                              d="M1 4L3.5 6.5L9 1"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDept(dept.name)}
                          className="sr-only"
                        />
                      </div>
                      <span
                        className={cn(
                          'flex-1 text-[13px]',
                          checked ? 'font-medium text-slate-900' : 'text-slate-700',
                        )}
                      >
                        {dept.name}
                      </span>
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                        {dept.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Email composer ──────────────────────────────────────── */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm p-5 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-[#EBF3FE] shrink-0">
                <Mail className="h-4 w-4 text-[#0C447C]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-slate-900">Compose broadcast</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {recipients.length > 0
                    ? `${recipients.length} recipient${recipients.length !== 1 ? 's' : ''} across ${selectedDepts.size} dept${selectedDepts.size !== 1 ? 's' : ''}`
                    : 'Select departments to add recipients'}
                </p>
              </div>
            </div>
            {recipients.length > 0 && (
              <span className="inline-flex items-center gap-1.5 shrink-0 text-[11px] font-medium text-[#0F6E56] bg-[#E1F5EE] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* From (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-700">From</label>
            <div className="h-10 flex items-center rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[13px] text-slate-500">
              {senderName} · Bosscoder HR Team
            </div>
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-700">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="e.g. Important update from HR"
              className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
            />
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-700">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={9}
              placeholder="Write your message here…&#10;&#10;Recipients will be greeted by their first name."
              className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 resize-none focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
            />
            <p className="text-[11px] text-slate-400">
              Each email starts with &quot;Hi [First name],&quot; and is signed with your name.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-[#FAC8C6] bg-[#FAECE7] px-3 py-2.5 text-[12px] text-[#993C1D]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="flex items-start gap-2 rounded-md border border-[#B7DDD0] bg-[#E1F5EE] px-3 py-2.5 text-[12px] text-[#0F6E56]">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Email sent successfully</p>
                <p className="text-[11px] mt-0.5 text-[#1D9E75]">
                  {result.sent} of {result.attempted} delivered
                  {result.failed > 0 && ` · ${result.failed} failed`}
                </p>
                {result.failures.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {result.failures.map((f, i) => (
                      <li key={i} className="text-[10px] text-[#993C1D]">
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            className="w-full gap-2 mt-1"
            isLoading={isPending}
            disabled={isPending || recipients.length === 0}
          >
            {!isPending && <Send className="h-4 w-4" />}
            {!isPending &&
              (recipients.length === 0
                ? 'Select recipients first'
                : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`)}
          </Button>
        </div>
      </div>
    </form>
  );
}

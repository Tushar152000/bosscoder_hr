'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { applyLeave } from '../actions';
import type { LeaveBalance, LeaveType } from '@/types/attendance';
import { LEAVE_LABELS } from '@/types/attendance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  balance: LeaveBalance;
}

const LEAVE_TYPES: LeaveType[] = ['casual', 'privilege', 'marriage', 'medical'];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function ApplyLeaveModal({ open, onOpenChange, employeeId, employeeName, balance }: Props) {
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLeaveType('casual');
      setFromDate('');
      setToDate('');
      setReason('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const b = balance[leaveType];
  const remaining = b.total - b.used;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fromDate || !toDate) { toast.error('Please select from and to dates'); return; }
    if (toDate < fromDate) { toast.error('End date must be on or after the start date'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }

    setSaving(true);
    const result = await applyLeave({
      employeeId,
      employeeName,
      fromDate,
      toDate,
      leaveType,
      reason: reason.trim(),
    });
    setSaving(false);

    if (result.ok) {
      toast.success('Leave request submitted successfully');
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">Apply for Leave</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* Leave type */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-500">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/10 transition"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{LEAVE_LABELS[t]}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              {remaining} day{remaining !== 1 ? 's' : ''} remaining
            </p>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-slate-500">From Date</label>
              <input
                type="date"
                value={fromDate}
                min={todayISO()}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (toDate && e.target.value > toDate) setToDate(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/10 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-slate-500">To Date</label>
              <input
                type="date"
                value={toDate}
                min={fromDate || todayISO()}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/10 transition"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-500">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Brief reason for the leave request…"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/10 transition placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#0C447C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0a3a6a] transition disabled:opacity-60"
            >
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

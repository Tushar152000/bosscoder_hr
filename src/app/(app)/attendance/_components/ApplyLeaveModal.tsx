'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { applyLeave } from '../actions';
import type { LeaveBalance, LeaveRequest, LeaveType } from '@/types/attendance';
import {
  LEAVE_LABELS,
  ALL_LEAVE_TYPES,
  LEAVE_TO_BALANCE,
  HALF_DAY_LEAVE_TYPES,
} from '@/types/attendance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  balance: LeaveBalance;
  onApplied?: (req: LeaveRequest) => void;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function ApplyLeaveModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  balance,
  onApplied,
}: Props) {
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const isHalfDay = HALF_DAY_LEAVE_TYPES.has(leaveType);
  const b = balance[LEAVE_TO_BALANCE[leaveType]];
  const isUnlimited = b.total === 0;
  const remaining = isUnlimited ? null : b.total - b.used;

  useEffect(() => {
    if (open) {
      setLeaveType('casual');
      setFromDate('');
      setToDate('');
      setReason('');
    }
  }, [open]);

  // For half-day types, lock toDate = fromDate
  useEffect(() => {
    if (isHalfDay) setToDate(fromDate);
  }, [isHalfDay, fromDate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fromDate) { toast.error('Please select a date'); return; }
    if (!isHalfDay && !toDate) { toast.error('Please select an end date'); return; }
    if (!isHalfDay && toDate < fromDate) { toast.error('End date must be on or after the start date'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }

    const effectiveToDate = isHalfDay ? fromDate : toDate;

    setSaving(true);
    const result = await applyLeave({
      employeeId,
      employeeName,
      fromDate,
      toDate: effectiveToDate,
      leaveType,
      reason: reason.trim(),
    });
    setSaving(false);

    if (result.ok) {
      toast.success('Leave request submitted');
      onApplied?.({
        employeeId,
        employeeName,
        fromDate,
        toDate: effectiveToDate,
        leaveType,
        reason: reason.trim(),
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
      });
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-[500px] items-center justify-center bg-black/40 px-4">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0"
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-zinc-900">Apply for leave</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave type */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-zinc-600">Leave type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400"
            >
              {ALL_LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_LABELS[t]}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-zinc-500">
              {isUnlimited
                ? 'Unlimited (unpaid)'
                : `${remaining} day${remaining !== 1 ? 's' : ''} remaining`}
            </p>
          </div>

          {/* Dates */}
          <div className={isHalfDay ? '' : 'grid grid-cols-2 gap-3'}>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-zinc-600">
                {isHalfDay ? 'Date' : 'From date'}
              </label>
              <input
                type="date"
                value={fromDate}
                min={todayISO()}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (!isHalfDay && toDate && e.target.value > toDate) setToDate(e.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400"
              />
            </div>
            {!isHalfDay && (
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-zinc-600">To date</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || todayISO()}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400"
                />
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-zinc-600">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Brief reason for the leave…"
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[13px] text-zinc-500 transition hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60"
            >
              {saving ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
